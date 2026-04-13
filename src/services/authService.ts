import bcrypt from "bcrypt";
import crypto from "crypto";
import { AppError } from "../middleware/errorHandler.js";
import { UserRepository } from "../repositories/userRepository.js";
import { RefreshTokenRepository } from "../repositories/refreshTokenRepository.js";
import { TokenService } from "./tokenService.js";
import { PasswordResetTokenModel } from "../models/PasswordResetToken.js";
import type { IUser } from "../models/User.js";

const SALT_ROUNDS = 12;

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly refreshTokenRepository: RefreshTokenRepository = new RefreshTokenRepository(),
    private readonly tokenService: TokenService = new TokenService(),
  ) {}

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(409, "CONFLICT", "Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userRepository.create({ email, passwordHash, displayName });

    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(String(user._id));

    return { user, accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
    }

    if (!user.isActive) {
      throw new AppError(403, "FORBIDDEN", "Account is deactivated");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
    }

    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(String(user._id));

    return { user, accessToken, refreshToken };
  }

  async refresh(
    refreshTokenValue: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const stored = await this.refreshTokenRepository.findByToken(refreshTokenValue);
    if (!stored) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
    }

    if (stored.expiresAt < new Date()) {
      await this.refreshTokenRepository.deleteByToken(refreshTokenValue);
      throw new AppError(401, "UNAUTHORIZED", "Refresh token expired");
    }

    const user = await this.userRepository.findById(String(stored.userId));
    if (!user || !user.isActive) {
      await this.refreshTokenRepository.deleteByToken(refreshTokenValue);
      throw new AppError(401, "UNAUTHORIZED", "User not found or deactivated");
    }

    // Rotation : supprimer l'ancien, créer un nouveau
    await this.refreshTokenRepository.deleteByToken(refreshTokenValue);

    const accessToken = this.tokenService.generateAccessToken(user);
    const newRefreshToken = await this.createRefreshToken(String(user._id));

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteAllForUser(userId);
  }

  async requestPasswordReset(email: string): Promise<{ token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Ne pas révéler si l'email existe
      return { token: "" };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await PasswordResetTokenModel.create({
      userId: user._id,
      token,
      expiresAt,
    });

    // En production : envoyer l'email via notification-service
    // Pour le MVP, retourner le token (utile pour les tests)
    return { token };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await PasswordResetTokenModel.findOne({ token, used: false }).exec();
    if (!resetToken) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid or expired reset token");
    }

    if (resetToken.expiresAt < new Date()) {
      throw new AppError(400, "VALIDATION_ERROR", "Reset token expired");
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepository.updatePassword(String(resetToken.userId), passwordHash);

    resetToken.used = true;
    await resetToken.save();

    // Invalider tous les refresh tokens de l'utilisateur
    await this.refreshTokenRepository.deleteAllForUser(String(resetToken.userId));
  }

  async getMe(userId: string): Promise<IUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    return user;
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date(Date.now() + this.parseExpiry());
    await this.refreshTokenRepository.create(userId, token, expiresAt);
    return token;
  }

  private parseExpiry(): number {
    const raw = this.tokenService.getRefreshExpiresIn();
    const match = raw.match(/^(\d+)([dhms])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // 7d default
    const value = parseInt(match[1]!, 10);
    const unit = match[2];
    switch (unit) {
      case "d": return value * 24 * 60 * 60 * 1000;
      case "h": return value * 60 * 60 * 1000;
      case "m": return value * 60 * 1000;
      case "s": return value * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
