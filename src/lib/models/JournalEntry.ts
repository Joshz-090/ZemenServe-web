import mongoose, { Schema, Document, Model } from 'mongoose';

export type JournalStatus = 'Draft' | 'Posted' | 'Reversed';
export type JournalSourceModule =
  | 'Rooms'
  | 'POS'
  | 'Events'
  | 'Inventory'
  | 'AP'
  | 'AR'
  | 'Treasury'
  | 'Banking'
  | 'Payroll'
  | 'Manual'
  | 'Adjustment'
  | 'Reversal';

export interface IJournalLine {
  accountId: mongoose.Types.ObjectId;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  debitCents: number;
  creditCents: number;
  description: string;
  partnerType?: 'Guest' | 'Supplier' | 'Employee' | null;
  partnerId?: number | null;
  partnerName?: string | null;
  costCenter?: string | null;
}

export interface IJournalEntry extends Document {
  idNumber: number;
  entryNumber: string; // e.g. 'JE-2026-00001'
  date: string; // 'YYYY-MM-DD'
  accountingDate: string; // 'YYYY-MM-DD'
  periodCode?: string;
  status: JournalStatus;
  sourceModule: JournalSourceModule;
  sourceReferenceId?: string; // Idempotency Key (e.g. 'order-102', 'folio-55')
  sourceDocumentNumber?: string; // e.g. 'INV-2026-001', 'ORD-101'
  memo: string;
  department?: string; // Cost center
  totalDebit: number;
  totalCredit: number;
  totalDebitCents: number;
  totalCreditCents: number;
  lines: IJournalLine[];
  createdBy: string;
  approvedBy?: string | null;
  postedBy?: string | null;
  postedAt?: Date | null;
  isReversed: boolean;
  reversedByEntryNumber?: string | null;
  reversalOfEntryNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const JournalLineSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountCode: { type: String, required: true, trim: true, index: true },
    accountName: { type: String, required: true, trim: true },
    debit: { type: Number, required: true, default: 0 },
    credit: { type: Number, required: true, default: 0 },
    debitCents: { type: Number, required: true, default: 0 },
    creditCents: { type: Number, required: true, default: 0 },
    description: { type: String, required: true, trim: true },
    partnerType: { type: String, enum: ['Guest', 'Supplier', 'Employee', null], default: null },
    partnerId: { type: Number, default: null },
    partnerName: { type: String, default: null, trim: true },
    costCenter: { type: String, default: null, trim: true },
  },
  { _id: true }
);

const JournalEntrySchema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    entryNumber: { type: String, required: true, unique: true, index: true, trim: true },
    date: { type: String, required: true, index: true, trim: true },
    accountingDate: { type: String, required: true, index: true, trim: true },
    periodCode: { type: String, default: '', index: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['Draft', 'Posted', 'Reversed'],
      default: 'Draft',
      index: true,
    },
    sourceModule: {
      type: String,
      required: true,
      enum: [
        'Rooms',
        'POS',
        'Events',
        'Inventory',
        'AP',
        'AR',
        'Treasury',
        'Banking',
        'Payroll',
        'Manual',
        'Adjustment',
        'Reversal',
      ],
      index: true,
    },
    sourceReferenceId: { type: String, default: null, index: true, trim: true },
    sourceDocumentNumber: { type: String, default: '', trim: true },
    memo: { type: String, required: true, trim: true },
    department: { type: String, default: 'General Hotel', trim: true },
    totalDebit: { type: Number, required: true, default: 0 },
    totalCredit: { type: Number, required: true, default: 0 },
    totalDebitCents: { type: Number, required: true, default: 0 },
    totalCreditCents: { type: Number, required: true, default: 0 },
    lines: {
      type: [JournalLineSchema],
      required: true,
      validate: [
        (val: IJournalLine[]) => val.length >= 2,
        'Journal entry must contain at least 2 balancing lines.',
      ],
    },
    createdBy: { type: String, required: true, trim: true },
    approvedBy: { type: String, default: null, trim: true },
    postedBy: { type: String, default: null, trim: true },
    postedAt: { type: Date, default: null },
    isReversed: { type: Boolean, default: false, index: true },
    reversedByEntryNumber: { type: String, default: null, trim: true },
    reversalOfEntryNumber: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

// Compound Index for idempotent event posting
JournalEntrySchema.index(
  { sourceModule: 1, sourceReferenceId: 1 },
  { unique: true, partialFilterExpression: { sourceReferenceId: { $type: 'string' } } }
);

export const JournalEntryModel: Model<IJournalEntry> =
  mongoose.models.JournalEntry ||
  mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);
