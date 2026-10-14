import mongoose, { Schema, Document, Model } from 'mongoose';

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type NormalBalance = 'Debit' | 'Credit';

export interface IAccount extends Document {
  code: string;
  name: string;
  type: AccountType;
  subType: string;
  normalBalance: NormalBalance;
  parentCode?: string | null;
  currency: string;
  isActive: boolean;
  isReconcilable: boolean;
  ethiopianTaxMapping?: string | null;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'],
      index: true,
    },
    subType: { type: String, required: true, trim: true },
    normalBalance: {
      type: String,
      required: true,
      enum: ['Debit', 'Credit'],
    },
    parentCode: { type: String, default: null, trim: true },
    currency: { type: String, default: 'ETB', trim: true },
    isActive: { type: Boolean, default: true, index: true },
    isReconcilable: { type: Boolean, default: false },
    ethiopianTaxMapping: { type: String, default: null, trim: true },
    description: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export const AccountModel: Model<IAccount> =
  mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
