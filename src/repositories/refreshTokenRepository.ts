import mongoose from "mongoose";
import { RefreshTokenModel, type IRefreshToken } from "../models/RefreshToken.js";

export class RefreshTokenRepository {
  async create(userId: string, token: string, expiresAt: Date): Promise<IRefreshToken> {
    return RefreshTokenModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      token,
      expiresAt,
    });
  }

  async findByToken(token: string): Promise<IRefreshToken | null> {
    return RefreshTokenModel.findOne({ token }).exec();
  }

  async deleteByToken(token: string): Promise<void> {
    await RefreshTokenModel.deleteOne({ token }).exec();
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();
  }
}
