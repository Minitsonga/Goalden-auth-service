import { Router } from "express";
import { AuthService } from "../services/authService.js";
import { requireAdmin, userAuth } from "../middleware/userAuth.js";
import { validateBody } from "../middleware/validate.js";
import { updateMyProfileSchema, updateUserRoleSchema } from "../validators/auth.validators.js";

const router = Router();
const authService = new AuthService();

router.get("/me", userAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({
      id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      globalRole: user.globalRole,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      avatarFileId: user.avatarFileId ?? null,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/me", userAuth, validateBody(updateMyProfileSchema), async (req, res, next) => {
  try {
    const body = req.body as { displayName?: string; avatarFileId?: string | null };
    const user = await authService.updateMyProfile(
      req.user!.id,
      body,
      Boolean(req.user!.isSuperAdmin),
    );
    res.json({
      id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      globalRole: user.globalRole,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      avatarFileId: user.avatarFileId ?? null,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:userId/global-role", userAuth, requireAdmin, validateBody(updateUserRoleSchema), async (req, res, next) => {
  try {
    const { userId } = req.params as { userId: string };
    const { globalRole } = req.body as { globalRole: "USER" | "COACH" | "ADMIN" };
    const user = await authService.updateUserRole(userId, globalRole);
    res.json({
      id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      globalRole: user.globalRole,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
