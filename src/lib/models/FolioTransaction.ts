import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFolioTransaction extends Document {
  idNumber: number;
  reservationId: number;
  roomNumber: string;
  guestName: string;
  category: string;
  description: string;
  amount: number;
  type: 'Debit' | 'Credit';
  paymentMethod?: string;
  timestamp: string;
  postedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const FolioTransactionSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    reservationId: { type: Number, required: true },
    roomNumber: { type: String, required: true },
    guestName: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true, enum: ['Debit', 'Credit'] },
    paymentMethod: { type: String },
    timestamp: { type: String, required: true },
    postedBy: { type: String, required: true, default: 'Receptionist' },
  },
  { timestamps: true }
);

export const FolioTransactionModel: Model<IFolioTransaction> =
  mongoose.models.FolioTransaction || mongoose.model<IFolioTransaction>('FolioTransaction', FolioTransactionSchema);
