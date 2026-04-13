import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  avatarFileId?: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    avatarFileId: { type: String },
    isActive: { type: Boolean, default: true },
    isSuperAdmin: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

UserSchema.index({ email: 1 }, { unique: true });

export const UserModel: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
