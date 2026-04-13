import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { AppError } from "./errorHandler.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

/**
 * Middleware auth utilisateur - valide le JWT User (access token)
 */
export function userAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next(new AppError(401, "UNAUTHORIZED", "Missing or invalid authorization"));
    return;
  }

  const token = authHeader.slice(7);
  if (!config.jwt.userSecret) {
    next(new AppError(503, "SERVICE_UNAVAILABLE", "User auth not configured"));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.userSecret) as {
      userId?: string;
      email?: string;
      sub?: string;
    };
    const userId = decoded.userId ?? decoded.sub;
    if (!userId) {
      next(new AppError(401, "UNAUTHORIZED", "Invalid token payload"));
      return;
    }
    req.user = { id: userId, email: decoded.email ?? "" };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
}
