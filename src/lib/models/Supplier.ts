import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplier extends Document {
  idNumber: number;
  supplierCode: string; // e.g. 'SUP-1001'
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  tinNumber: string; // Ethiopian 10-digit TIN
  vatRegistered: boolean;
  withholdingAgent: boolean; // default false (2% WHT applies on payments > 10,000 ETB)
  category: string; // e.g. 'Food & Meat', 'Beverages & Spirits', 'Linen & Cleaning', 'Maintenance'
  paymentTermsDays: number; // e.g. 15, 30, 45
  bankName?: string;
  bankAccountNumber?: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  currentBalance: number; // Outstanding payable balance
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    supplierCode: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true, index: true },
    contactPerson: { type: String, default: '', trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    tinNumber: { type: String, default: '', trim: true, index: true },
    vatRegistered: { type: Boolean, default: true },
    withholdingAgent: { type: Boolean, default: false },
    category: { type: String, default: 'General Supplies', trim: true },
    paymentTermsDays: { type: Number, default: 30 },
    bankName: { type: String, default: 'Commercial Bank of Ethiopia (CBE)', trim: true },
    bankAccountNumber: { type: String, default: '', trim: true },
    address: { type: String, default: 'Addis Ababa, Ethiopia', trim: true },
    totalPurchases: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SupplierModel: Model<ISupplier> =
  mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
