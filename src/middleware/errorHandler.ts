import type { Request, Response, NextFunction } from "express";

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (process.env.NODE_ENV !== "test") {
    console.error("Error:", err);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof Error) {
    if (err.name === "ValidationError") {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: err.message,
      });
      return;
    }
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({
        error: "CONFLICT",
        message: "Resource already exists",
      });
      return;
    }
  }

  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
}
