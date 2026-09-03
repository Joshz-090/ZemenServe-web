import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'Admin' | 'Manager' | 'Cashier' | 'Chef' | 'Waiter';
  isActive: boolean;
  resetRequest?: {
    isPending: boolean;
    requestedAt?: Date;
    userNote?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, trim: true, default: '' },
    role: {
      type: String,
      required: true,
      enum: ['Admin', 'Manager', 'Cashier', 'Chef', 'Waiter'],
      default: 'Cashier',
    },
    isActive: { type: Boolean, required: true, default: true },
    resetRequest: {
      isPending: { type: Boolean, default: false },
      requestedAt: { type: Date },
      userNote: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
