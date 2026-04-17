import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { AppError } from "../middleware/errorHandler.js";
import type { IUser } from "../models/User.js";
import { SERVICE_PERMISSIONS } from "../types/index.js";

export class TokenService {
  generateAccessToken(user: IUser): string {
    if (!config.jwt.userSecret) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "JWT secret not configured");
    }
    return jwt.sign(
      {
        sub: String(user._id),
        userId: String(user._id),
        email: user.email,
        globalRole: user.globalRole ?? "USER",
        isSuperAdmin: Boolean(user.isSuperAdmin),
      },
      config.jwt.userSecret,
      { expiresIn: config.jwt.userExpiresIn } as jwt.SignOptions,
    );
  }

  generateServiceToken(serviceId: string): { token: string; expiresIn: number } {
    if (!config.jwt.serviceSecret) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Service JWT secret not configured");
    }

    const permissions = SERVICE_PERMISSIONS[serviceId] ?? [];
    const expiresIn = 24 * 60 * 60; // 24h en secondes

    const token = jwt.sign(
      {
        serviceId,
        scope: "internal",
        permissions,
      },
      config.jwt.serviceSecret,
      { expiresIn },
    );

    return { token, expiresIn };
  }

  verifyServiceToken(token: string): { serviceId: string; scope: string; permissions: string[] } {
    if (!config.jwt.serviceSecret) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Service JWT secret not configured");
    }

    try {
      const decoded = jwt.verify(token, config.jwt.serviceSecret) as {
        serviceId: string;
        scope: string;
        permissions: string[];
      };
      return decoded;
    } catch {
      throw new AppError(401, "UNAUTHORIZED", "Invalid or expired service token");
    }
  }

  getRefreshExpiresIn(): string {
    return config.jwt.refreshExpiresIn;
  }
}
