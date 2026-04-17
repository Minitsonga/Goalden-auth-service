import { Router } from "express";
import { AuthService } from "../services/authService.js";
import { userAuth } from "../middleware/userAuth.js";
import { validateBody } from "../middleware/validate.js";
import {
  registerSchema,
  registerWithInvitationSchema,
  loginSchema,
  refreshSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../validators/auth.validators.js";

const router = Router();
const authService = new AuthService();

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Use /api/auth/register-with-invitation: a club assignment is required at account creation.",
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/register-with-invitation", validateBody(registerWithInvitationSchema), async (req, res, next) => {
  try {
    const { email, password, displayName, invitationCode } = req.body as {
      email: string;
      password: string;
      displayName: string;
      invitationCode: string;
    };
    const result = await authService.registerWithInvitation(
      email,
      password,
      displayName,
      invitationCode,
    );
    res.status(201).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: String(result.user._id),
        email: result.user.email,
        displayName: result.user.displayName,
        globalRole: result.user.globalRole,
        isSuperAdmin: Boolean(result.user.isSuperAdmin),
        avatarFileId: result.user.avatarFileId ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: String(result.user._id),
        email: result.user.email,
        displayName: result.user.displayName,
        globalRole: result.user.globalRole,
        isSuperAdmin: Boolean(result.user.isSuperAdmin),
        avatarFileId: result.user.avatarFileId ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", validateBody(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await authService.refresh(refreshToken);
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: String(result.user._id),
        email: result.user.email,
        displayName: result.user.displayName,
        globalRole: result.user.globalRole,
        isSuperAdmin: Boolean(result.user.isSuperAdmin),
        avatarFileId: result.user.avatarFileId ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", userAuth, async (req, res, next) => {
  try {
    await authService.logout(req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/request-password-reset",
  validateBody(requestPasswordResetSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body as { email: string };
      const result = await authService.requestPasswordReset(email);
      // Toujours répondre 200 pour ne pas révéler si l'email existe
      res.json({
        message: "If this email is registered, a reset link has been sent",
        ...(process.env.NODE_ENV === "development" && result.token ? { token: result.token } : {}),
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      await authService.resetPassword(token, newPassword);
      res.json({ message: "Password has been reset successfully" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
