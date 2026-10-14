import mongoose, { Schema, Document, Model } from 'mongoose';

export type BillStatus = 'Draft' | 'Approved' | 'Paid' | 'Partial' | 'Cancelled';

export interface ISupplierBillLine {
  lineId: string;
  ingredientId?: number | null; // References Ingredient.idNumber if inventory item
  description: string;
  quantity: number;
  unit: string; // 'kg', 'L', 'pcs', 'bags', etc.
  unitPrice: number;
  lineTotal: number;
  vatRate: number; // e.g. 15.0 or 0
  vatAmount: number;
  assetOrExpenseAccountCode: string; // e.g. '1200' (Food Inventory), '1210' (Beverage), '6100' (Supplies)
}

export interface ISupplierBill extends Document {
  idNumber: number;
  billNumber: string; // e.g. 'BILL-2026-00001'
  supplierInvoiceNumber: string; // Vendor's tax invoice reference
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  supplierTin?: string;
  billDate: string; // 'YYYY-MM-DD'
  dueDate: string; // 'YYYY-MM-DD'
  paymentTermsDays: number;
  status: BillStatus;
  purchaseOrderRef?: string;
  goodsReceivedRef?: string; // GRN reference
  lines: ISupplierBillLine[];
  subtotal: number;
  vatTotal: number; // 15% Input VAT
  withholdingTaxRate: number; // e.g. 2% or 0
  withholdingTaxAmount: number; // Withholding deducted
  grandTotal: number; // Net total payable to vendor
  amountPaid: number;
  balanceDue: number;
  journalEntryNumber?: string | null;
  matchedWithInventory: boolean;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierBillLineSchema = new Schema(
  {
    lineId: { type: String, required: true },
    ingredientId: { type: Number, default: null },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 1 },
    unit: { type: String, default: 'kg', trim: true },
    unitPrice: { type: Number, required: true, default: 0 },
    lineTotal: { type: Number, required: true, default: 0 },
    vatRate: { type: Number, default: 15.0 },
    vatAmount: { type: Number, default: 0 },
    assetOrExpenseAccountCode: { type: String, required: true, default: '1200' },
  },
  { _id: true }
);

const SupplierBillSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    billNumber: { type: String, required: true, unique: true, index: true, trim: true },
    supplierInvoiceNumber: { type: String, required: true, trim: true },
    supplierId: { type: Number, required: true, index: true },
    supplierCode: { type: String, required: true, trim: true },
    supplierName: { type: String, required: true, trim: true, index: true },
    supplierTin: { type: String, default: '', trim: true },
    billDate: { type: String, required: true, index: true, trim: true },
    dueDate: { type: String, required: true, index: true, trim: true },
    paymentTermsDays: { type: Number, default: 30 },
    status: {
      type: String,
      required: true,
      enum: ['Draft', 'Approved', 'Paid', 'Partial', 'Cancelled'],
      default: 'Approved',
      index: true,
    },
    purchaseOrderRef: { type: String, default: '', trim: true },
    goodsReceivedRef: { type: String, default: '', trim: true },
    lines: {
      type: [SupplierBillLineSchema],
      required: true,
      validate: [(v: ISupplierBillLine[]) => v.length > 0, 'Bill must have at least one line item.'],
    },
    subtotal: { type: Number, required: true, default: 0 },
    vatTotal: { type: Number, required: true, default: 0 },
    withholdingTaxRate: { type: Number, default: 0 },
    withholdingTaxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, required: true, default: 0 },
    journalEntryNumber: { type: String, default: null, trim: true },
    matchedWithInventory: { type: Boolean, default: false },
    approvedBy: { type: String, default: null, trim: true },
    approvedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

SupplierBillSchema.index({ supplierName: 1, billDate: -1 });
SupplierBillSchema.index({ status: 1, dueDate: 1 });

export const SupplierBillModel: Model<ISupplierBill> =
  mongoose.models.SupplierBill ||
  mongoose.model<ISupplierBill>('SupplierBill', SupplierBillSchema);
