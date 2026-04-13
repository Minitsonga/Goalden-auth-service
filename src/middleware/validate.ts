import type { Request, Response, NextFunction } from "express";
import type Joi from "joi";
import { AppError } from "./errorHandler.js";

export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          error.details.map((d) => d.message).join("; "),
        ),
      );
      return;
    }
    req.body = value;
    next();
  };
}
