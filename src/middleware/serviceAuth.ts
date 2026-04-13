import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { AppError } from "./errorHandler.js";

/**
 * Middleware pour routes /internal/* - valide le Service Token
 */
export function serviceAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next(new AppError(401, "UNAUTHORIZED", "Service token required"));
    return;
  }

  const token = authHeader.slice(7);

  if (!config.jwt.serviceSecret) {
    next(new AppError(503, "SERVICE_UNAVAILABLE", "Service auth not configured"));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.serviceSecret) as {
      serviceId?: string;
      scope?: string;
    };
    if (decoded.scope !== "internal") {
      next(new AppError(403, "FORBIDDEN", "Invalid token scope"));
      return;
    }
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired service token"));
  }
}
