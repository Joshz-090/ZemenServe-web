import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGuest extends Document {
  idNumber: number;
  fullName: string;
  email: string;
  phone: string;
  idPassportNumber: string;
  idType: string;
  dateOfBirth?: string;
  idImageUrl?: string;
  nationality: string;
  vipStatus: boolean;
  totalStays: number;
  totalSpent: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GuestSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    idPassportNumber: { type: String, required: true },
    idType: { type: String, default: 'National ID (Fayda / FIN)' },
    dateOfBirth: { type: String },
    idImageUrl: { type: String },
    nationality: { type: String, default: 'Ethiopia' },
    vipStatus: { type: Boolean, default: false },
    totalStays: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const GuestModel: Model<IGuest> =
  mongoose.models.Guest || mongoose.model<IGuest>('Guest', GuestSchema);
