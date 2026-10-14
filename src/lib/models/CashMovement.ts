import mongoose, { Schema, Document, Model } from 'mongoose';

export type MovementType =
  | 'DRAWER_TO_SAFE_DROP'
  | 'SAFE_TO_DRAWER_FLOAT'
  | 'PETTY_CASH_EXPENSE'
  | 'BANK_DEPOSIT'
  | 'BANK_TRANSFER'
  | 'MOBILE_MONEY_SWEEP';

export type MovementStatus = 'Completed' | 'Pending' | 'Cancelled';

export interface ICashMovement extends Document {
  movementNumber: string; // e.g. 'MOV-202610-0001'
  shiftNumber?: string | null;
  movementType: MovementType;
  fromAccountCode: string; // '1010', '1030', '1040', etc.
  toAccountCode: string; // '1030', '1060', '6900', etc.
  amount: number; // in ETB
  description: string;
  reference?: string;
  performedBy: string;
  approvedBy?: string | null;
  journalEntryNumber?: string | null;
  date: string; // 'YYYY-MM-DD'
  status: MovementStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CashMovementSchema = new Schema<ICashMovement>(
  {
    movementNumber: { type: String, required: true, unique: true, trim: true },
    shiftNumber: { type: String, default: null },
    movementType: {
      type: String,
      required: true,
      enum: [
        'DRAWER_TO_SAFE_DROP',
        'SAFE_TO_DRAWER_FLOAT',
        'PETTY_CASH_EXPENSE',
        'BANK_DEPOSIT',
        'BANK_TRANSFER',
        'MOBILE_MONEY_SWEEP',
      ],
    },
    fromAccountCode: { type: String, required: true, trim: true },
    toAccountCode: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    reference: { type: String, default: '' },
    performedBy: { type: String, required: true },
    approvedBy: { type: String, default: null },
    journalEntryNumber: { type: String, default: null },
    date: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['Completed', 'Pending', 'Cancelled'],
      default: 'Completed',
    },
  },
  {
    timestamps: true,
  }
);

CashMovementSchema.index({ date: -1 });
CashMovementSchema.index({ shiftNumber: 1 });

export const CashMovementModel: Model<ICashMovement> =
  mongoose.models.CashMovement ||
  mongoose.model<ICashMovement>('CashMovement', CashMovementSchema);
