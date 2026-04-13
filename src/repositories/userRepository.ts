import mongoose from "mongoose";
import { UserModel, type IUser } from "../models/User.js";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
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
}
