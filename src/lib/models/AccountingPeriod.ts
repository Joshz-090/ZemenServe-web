import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAccountingPeriod extends Document {
  periodCode: string; // e.g. 'FY2026-M01', 'FY2026-M02'
  name: string; // e.g. 'January 2026'
  fiscalYear: number; // e.g. 2026
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  isClosed: boolean;
  closedAt?: Date | null;
  closedBy?: string | null;
  closingNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountingPeriodSchema: Schema = new Schema(
  {
    periodCode: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    fiscalYear: { type: Number, required: true, index: true },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, required: true, trim: true },
    isClosed: { type: Boolean, default: false, index: true },
    closedAt: { type: Date, default: null },
    closedBy: { type: String, default: null, trim: true },
    closingNotes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export const AccountingPeriodModel: Model<IAccountingPeriod> =
  mongoose.models.AccountingPeriod ||
  mongoose.model<IAccountingPeriod>('AccountingPeriod', AccountingPeriodSchema);
