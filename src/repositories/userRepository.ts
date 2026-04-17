import mongoose from "mongoose";
import { UserModel, type IUser } from "../models/User.js";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  globalRole?: "USER" | "COACH" | "ADMIN";
}

export class UserRepository {
  async create(data: CreateUserInput): Promise<IUser> {
    return UserModel.create(data);
  }

  async findById(id: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return UserModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByIds(ids: string[]): Promise<IUser[]> {
    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    return UserModel.find({ _id: { $in: objectIds } }).exec();
  }

  async updatePassword(id: string, passwordHash: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      id,
      { $set: { passwordHash } },
      { new: true },
    ).exec();
  }

  async updateGlobalRole(id: string, globalRole: "USER" | "COACH" | "ADMIN"): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return UserModel.findByIdAndUpdate(
      id,
      { $set: { globalRole } },
      { new: true },
    ).exec();
  }

  async updateProfile(
    id: string,
    patch: { displayName?: string; avatarFileId?: string | null },
  ): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const $set: Record<string, unknown> = {};
    let unsetAvatar = false;
    if (patch.displayName !== undefined) {
      $set.displayName = patch.displayName;
    }
    if (patch.avatarFileId !== undefined) {
      if (patch.avatarFileId === null || patch.avatarFileId === "") {
        unsetAvatar = true;
      } else {
        $set.avatarFileId = patch.avatarFileId;
      }
    }
    if (Object.keys($set).length === 0 && !unsetAvatar) {
      return UserModel.findById(id).exec();
    }
    const update: mongoose.UpdateQuery<IUser> = {};
    if (Object.keys($set).length > 0) {
      update.$set = $set;
    }
    if (unsetAvatar) {
      update.$unset = { avatarFileId: 1 };
    }
    return UserModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async deleteById(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await UserModel.findByIdAndDelete(id).exec();
  }
}
