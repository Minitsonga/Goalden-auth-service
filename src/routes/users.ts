import { Router } from "express";
import { AuthService } from "../services/authService.js";
import { userAuth } from "../middleware/userAuth.js";

const router = Router();
const authService = new AuthService();

router.get("/me", userAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({
      id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      avatarFileId: user.avatarFileId ?? null,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
