import mongoose, { Schema, Document, Model } from 'mongoose';

export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Partial' | 'Cancelled';
export type InvoiceType = 'RoomStay' | 'RestaurantPOS' | 'EventBanquet' | 'CorporateContract' | 'GeneralService';
export type CustomerType = 'Guest' | 'Corporate' | 'Airline' | 'Government / NGO' | 'General';

export interface IInvoiceLine {
  lineId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  netAmount: number;
  vatRate: number; // e.g. 15.0
  vatAmount: number;
  serviceChargeRate: number; // e.g. 10.0 or 0
  serviceChargeAmount: number;
  totalLineAmount: number;
  revenueAccountCode: string; // e.g. '4010', '4020', '4040'
}

export interface ICustomerInvoice extends Document {
  idNumber: number;
  invoiceNumber: string; // e.g. 'INV-2026-00001'
  invoiceType: InvoiceType;
  customerType: CustomerType;
  customerId?: number | null;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTin?: string; // Ethiopian 10-digit TIN
  customerAddress?: string;
  reservationId?: number | null;
  eventBookingId?: number | null;
  orderId?: number | null;
  roomNumber?: string;
  issueDate: string; // 'YYYY-MM-DD'
  dueDate: string; // 'YYYY-MM-DD'
  paymentTermsDays: number; // e.g. 0, 15, 30
  status: InvoiceStatus;
  lines: IInvoiceLine[];
  subtotal: number;
  totalDiscount: number;
  vatTotal: number; // 15%
  serviceChargeTotal: number; // 10%
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  journalEntryNumber?: string | null;
  hotelTin: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineSchema = new Schema(
  {
    lineId: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    netAmount: { type: Number, required: true, default: 0 },
    vatRate: { type: Number, default: 15.0 },
    vatAmount: { type: Number, default: 0 },
    serviceChargeRate: { type: Number, default: 0 },
    serviceChargeAmount: { type: Number, default: 0 },
    totalLineAmount: { type: Number, required: true, default: 0 },
    revenueAccountCode: { type: String, required: true, default: '4010' },
  },
  { _id: true }
);

const CustomerInvoiceSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, index: true, trim: true },
    invoiceType: {
      type: String,
      required: true,
      enum: ['RoomStay', 'RestaurantPOS', 'EventBanquet', 'CorporateContract', 'GeneralService'],
      default: 'RoomStay',
      index: true,
    },
    customerType: {
      type: String,
      required: true,
      enum: ['Guest', 'Corporate', 'Airline', 'Government / NGO', 'General'],
      default: 'Guest',
      index: true,
    },
    customerId: { type: Number, default: null, index: true },
    customerName: { type: String, required: true, trim: true, index: true },
    customerPhone: { type: String, default: '', trim: true },
    customerEmail: { type: String, default: '', trim: true },
    customerTin: { type: String, default: '', trim: true },
    customerAddress: { type: String, default: '', trim: true },
    reservationId: { type: Number, default: null, index: true },
    eventBookingId: { type: Number, default: null, index: true },
    orderId: { type: Number, default: null, index: true },
    roomNumber: { type: String, default: '', trim: true },
    issueDate: { type: String, required: true, index: true, trim: true },
    dueDate: { type: String, required: true, index: true, trim: true },
    paymentTermsDays: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['Draft', 'Issued', 'Paid', 'Partial', 'Cancelled'],
      default: 'Issued',
      index: true,
    },
    lines: {
      type: [InvoiceLineSchema],
      required: true,
      validate: [(v: IInvoiceLine[]) => v.length > 0, 'Invoice must have at least one line item.'],
    },
    subtotal: { type: Number, required: true, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    vatTotal: { type: Number, required: true, default: 0 },
    serviceChargeTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, required: true, default: 0 },
    journalEntryNumber: { type: String, default: null, trim: true },
    hotelTin: { type: String, default: '0098765432', trim: true }, // Default Hotel TIN
    notes: { type: String, default: '', trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

CustomerInvoiceSchema.index({ customerName: 1, issueDate: -1 });
CustomerInvoiceSchema.index({ status: 1, dueDate: 1 });

export const CustomerInvoiceModel: Model<ICustomerInvoice> =
  mongoose.models.CustomerInvoice ||
  mongoose.model<ICustomerInvoice>('CustomerInvoice', CustomerInvoiceSchema);
