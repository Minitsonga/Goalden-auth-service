import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler.js";
import { UserRepository } from "../repositories/userRepository.js";
import { RefreshTokenRepository } from "../repositories/refreshTokenRepository.js";
import { TokenService } from "./tokenService.js";
import { PasswordResetTokenModel } from "../models/PasswordResetToken.js";
import type { IUser } from "../models/User.js";
import { config } from "../config/index.js";

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

  async registerWithInvitation(
    email: string,
    password: string,
    displayName: string,
    invitationCode: string,
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const result = await this.register(email, password, displayName);
    try {
      await this.consumeTeamInvitation({
        code: invitationCode,
        userId: String(result.user._id),
        userEmail: result.user.email,
      });
    } catch (err) {
      await this.userRepository.deleteById(String(result.user._id));
      throw err;
    }
    return result;
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
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const now = new Date();
    const stored = await this.refreshTokenRepository.consumeValidToken(refreshTokenValue, now);
    if (!stored) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
    }

    const user = await this.userRepository.findById(String(stored.userId));
    if (!user || !user.isActive) {
      throw new AppError(401, "UNAUTHORIZED", "User not found or deactivated");
    }

    const accessToken = this.tokenService.generateAccessToken(user);
    const newRefreshToken = await this.createRefreshToken(String(user._id));

    return { user, accessToken, refreshToken: newRefreshToken };
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

  async updateMyProfile(
    userId: string,
    patch: { displayName?: string; avatarFileId?: string | null },
    isSuperAdmin: boolean,
  ): Promise<IUser> {
    await this.assertUserMayEditProfile(userId, isSuperAdmin);

    if (patch.avatarFileId != null && patch.avatarFileId !== "") {
      const ok = mongoose.Types.ObjectId.isValid(patch.avatarFileId);
      if (!ok) {
        throw new AppError(400, "VALIDATION_ERROR", "avatarFileId must be a valid ObjectId");
      }
    }

    const updated = await this.userRepository.updateProfile(userId, patch);
    if (!updated) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    return updated;
  }

  async updateUserRole(
    targetUserId: string,
    globalRole: "USER" | "COACH" | "ADMIN",
  ): Promise<IUser> {
    const updated = await this.userRepository.updateGlobalRole(targetUserId, globalRole);
    if (!updated) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    return updated;
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

  private async assertUserMayEditProfile(userId: string, isSuperAdmin: boolean): Promise<void> {
    if (isSuperAdmin) {
      return;
    }
    if (!config.jwt.serviceSecret) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Service JWT not configured");
    }
    const teamServiceUrl = process.env.TEAM_SERVICE_URL ?? "http://localhost:3002";
    const serviceToken = jwt.sign(
      { serviceId: "auth-service", scope: "internal", permissions: [] },
      config.jwt.serviceSecret,
      { expiresIn: "10m" },
    );
    const url = `${teamServiceUrl}/internal/users/${encodeURIComponent(userId)}/profile-eligibility`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${serviceToken}` },
      });
    } catch {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to reach team-service");
    }
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError(
        503,
        "SERVICE_UNAVAILABLE",
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error?: { message?: string } }).error?.message ?? "Membership check failed")
          : "Membership check failed",
      );
    }
    const hasMembership =
      typeof body === "object" &&
      body !== null &&
      "data" in body &&
      typeof (body as { data?: { hasMembership?: boolean } }).data?.hasMembership === "boolean"
        ? Boolean((body as { data: { hasMembership: boolean } }).data.hasMembership)
        : false;
    if (!hasMembership) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "An active club, section or team membership is required to update your profile",
      );
    }
  }

  private async consumeTeamInvitation(params: {
    code: string;
    userId: string;
    userEmail: string;
  }): Promise<void> {
    if (!config.jwt.serviceSecret) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Service JWT secret not configured");
    }
    const teamServiceUrl = process.env.TEAM_SERVICE_URL ?? "http://localhost:3002";
    const serviceToken = jwt.sign(
      { serviceId: "auth-service", scope: "internal", permissions: [] },
      config.jwt.serviceSecret,
      { expiresIn: "10m" },
    );
    const response = await fetch(`${teamServiceUrl}/internal/invitations/consume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify(params),
    });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError(
        response.status === 403 ? 403 : 400,
        body?.error?.code ?? "INVITATION_CONSUME_FAILED",
        body?.error?.message ?? "Unable to consume invitation",
      );
    }
  }
}
