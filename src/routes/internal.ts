import { Router } from "express";
import { TokenService } from "../services/tokenService.js";
import { UserRepository } from "../repositories/userRepository.js";
import { serviceAuthMiddleware } from "../middleware/serviceAuth.js";
import { validateBody } from "../middleware/validate.js";
import { serviceTokenSchema, usersBatchSchema } from "../validators/auth.validators.js";
import { AppError } from "../middleware/errorHandler.js";
import { config } from "../config/index.js";

const router = Router();
const tokenService = new TokenService();
const userRepository = new UserRepository();

/**
 * POST /internal/service-token
 * Émet un JWT service pour un service consumer authentifié
 * Pas de serviceAuthMiddleware ici : c'est le point d'entrée pour obtenir un token
 */
router.post(
  "/service-token",
  validateBody(serviceTokenSchema),
  async (req, res, next) => {
    try {
      const { serviceId, serviceSecret } = req.body as {
        serviceId: string;
        serviceSecret: string;
      };

      const expectedSecret = config.serviceSecrets.get(serviceId);
      if (!expectedSecret || expectedSecret !== serviceSecret) {
        throw new AppError(401, "UNAUTHORIZED", "Invalid service credentials");
      }

      const result = tokenService.generateServiceToken(serviceId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /internal/verify-service-token
 * Vérifie et décode un JWT service
 */
router.post("/verify-service-token", async (req, res, next) => {
  try {
    const { token } = req.body as { token: string };
    if (!token) {
      throw new AppError(400, "VALIDATION_ERROR", "Token is required");
    }
    const decoded = tokenService.verifyServiceToken(token);
    res.json(decoded);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /internal/users/:userId
 * Retourne un utilisateur par ID (pour les autres services)
 */
router.get("/users/:userId", serviceAuthMiddleware, async (req, res, next) => {
  try {
    const userId = String(req.params.userId ?? "");
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    res.json({
      _id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      avatarFileId: user.avatarFileId ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /internal/users/batch
 * Retourne plusieurs utilisateurs par IDs
 */
router.post(
  "/users/batch",
  serviceAuthMiddleware,
  validateBody(usersBatchSchema),
  async (req, res, next) => {
    try {
      const { userIds } = req.body as { userIds: string[] };
      const users = await userRepository.findByIds(userIds);
      res.json({
        users: users.map((u) => ({
          _id: String(u._id),
          email: u.email,
          displayName: u.displayName,
          avatarFileId: u.avatarFileId ?? null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
