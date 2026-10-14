import mongoose, { Schema, Document, Model } from 'mongoose';

export type BankAccountType = 'Bank' | 'MobileMoney' | 'CardClearing';
export type BankAccountStatus = 'Active' | 'Inactive';

export interface IBankAccount extends Document {
  bankId: string;
  accountName: string;
  accountType: BankAccountType;
  bankName: string;
  accountNumber: string;
  branch?: string;
  glAccountCode: string; // '1060', '1070', '1040', '1050'
  currency: string;
  currentBalance: number;
  status: BankAccountStatus;
  isPrimary: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    bankId: { type: String, required: true, unique: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      required: true,
      enum: ['Bank', 'MobileMoney', 'CardClearing'],
      default: 'Bank',
    },
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    branch: { type: String, default: 'Addis Ababa Main' },
    glAccountCode: { type: String, required: true, trim: true, default: '1060' },
    currency: { type: String, required: true, default: 'ETB', uppercase: true },
    currentBalance: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    isPrimary: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const BankAccountModel: Model<IBankAccount> =
  mongoose.models.BankAccount || mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);
