import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(2).max(100).required(),
});

export const registerWithInvitationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(2).max(100).required(),
  invitationCode: Joi.string().min(6).max(12).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

export const serviceTokenSchema = Joi.object({
  serviceId: Joi.string().required(),
  serviceSecret: Joi.string().required(),
});

export const usersBatchSchema = Joi.object({
  userIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
});

export const updateUserRoleSchema = Joi.object({
  globalRole: Joi.string().valid("USER", "COACH", "ADMIN").required(),
});

/** Au moins un champ ; avatarFileId = id fichier renvoyé par file-service après upload (ObjectId hex). */
export const updateMyProfileSchema = Joi.object({
  displayName: Joi.string().min(2).max(100).trim().optional(),
  avatarFileId: Joi.string().hex().length(24).allow(null).optional(),
})
  .or("displayName", "avatarFileId")
  .messages({
    "object.missing": "At least one of displayName or avatarFileId is required",
  });
