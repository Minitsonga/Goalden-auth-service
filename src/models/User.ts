import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  globalRole: "USER" | "COACH" | "ADMIN";
  isSuperAdmin: boolean;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarFileId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    globalRole: { type: String, enum: ["USER", "COACH", "ADMIN"], default: "USER", required: true },
    isSuperAdmin: { type: Boolean, default: false },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    avatarFileId: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

export const UserModel: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
