import mongoose, { Schema, Document, Model } from 'mongoose';

export type ShiftStatus = 'Open' | 'Closed' | 'Audited';
export type VarianceStatus = 'Balanced' | 'Shortage' | 'Overage';

export interface INonCashTenders {
  telebirr: number;
  cbeBirr: number;
  card: number;
  bankTransfer: number;
  roomCharge: number;
}

export interface ICashierShift extends Document {
  shiftNumber: string; // e.g. 'CS-202610-0001'
  cashierId: string;
  cashierName: string;
  drawerId: string;
  station: string;
  glAccountCode: string; // '1010', '1020', etc.
  openedAt: Date;
  closedAt?: Date | null;
  status: ShiftStatus;
  openingFloat: number; // in ETB
  cashSales: number; // total cash received during shift
  cashPaidOut: number; // total cash paid out (petty cash/refunds)
  nonCashTenders: INonCashTenders;
  expectedCash: number; // openingFloat + cashSales - cashPaidOut
  closingCashCounted?: number | null; // actual physical cash counted
  cashVariance?: number | null; // closingCashCounted - expectedCash
  varianceStatus?: VarianceStatus | null;
  varianceReason?: string | null;
  varianceJournalEntryNumber?: string | null;
  dropToSafeAmount?: number | null;
  dropJournalEntryNumber?: string | null;
  closingFloatRemaining?: number | null;
  closedBy?: string | null;
  auditedBy?: string | null;
  auditedAt?: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NonCashTendersSchema = new Schema<INonCashTenders>(
  {
    telebirr: { type: Number, default: 0 },
    cbeBirr: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    bankTransfer: { type: Number, default: 0 },
    roomCharge: { type: Number, default: 0 },
  },
  { _id: false }
);

const CashierShiftSchema = new Schema<ICashierShift>(
  {
    shiftNumber: { type: String, required: true, unique: true, trim: true },
    cashierId: { type: String, required: true, trim: true },
    cashierName: { type: String, required: true, trim: true },
    drawerId: { type: String, required: true, trim: true },
    station: { type: String, required: true, default: 'Front Desk' },
    glAccountCode: { type: String, required: true, default: '1010' },
    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date, default: null },
    status: {
      type: String,
      required: true,
      enum: ['Open', 'Closed', 'Audited'],
      default: 'Open',
    },
    openingFloat: { type: Number, required: true, default: 0 },
    cashSales: { type: Number, required: true, default: 0 },
    cashPaidOut: { type: Number, required: true, default: 0 },
    nonCashTenders: {
      type: NonCashTendersSchema,
      default: () => ({
        telebirr: 0,
        cbeBirr: 0,
        card: 0,
        bankTransfer: 0,
        roomCharge: 0,
      }),
    },
    expectedCash: { type: Number, required: true, default: 0 },
    closingCashCounted: { type: Number, default: null },
    cashVariance: { type: Number, default: null },
    varianceStatus: {
      type: String,
      enum: ['Balanced', 'Shortage', 'Overage', null],
      default: null,
    },
    varianceReason: { type: String, default: null },
    varianceJournalEntryNumber: { type: String, default: null },
    dropToSafeAmount: { type: Number, default: 0 },
    dropJournalEntryNumber: { type: String, default: null },
    closingFloatRemaining: { type: Number, default: 0 },
    closedBy: { type: String, default: null },
    auditedBy: { type: String, default: null },
    auditedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

CashierShiftSchema.index({ drawerId: 1, status: 1 });
CashierShiftSchema.index({ cashierId: 1, status: 1 });
CashierShiftSchema.index({ openedAt: -1 });

export const CashierShiftModel: Model<ICashierShift> =
  mongoose.models.CashierShift ||
  mongoose.model<ICashierShift>('CashierShift', CashierShiftSchema);
