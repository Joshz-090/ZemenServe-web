import mongoose, { Schema, Document, Model } from 'mongoose';
import { MealPlan } from '../types';

export interface IContract extends Document {
  idNumber: number;
  contractNumber: string;
  clientName: string;
  clientType: string;
  contactPerson: string;
  phone: string;
  email?: string;
  roomType: string;
  agreedRate: number;
  mealPlan: MealPlan;
  includedAmenities: string[];
  discountPercentage?: number;
  startDate: string;
  endDate: string;
  notes?: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    contractNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    clientType: { type: String, required: true, default: 'Corporate' },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    roomType: { type: String, required: true, default: 'All Room Types' },
    agreedRate: { type: Number, required: true },
    mealPlan: { type: String, required: true, default: 'Room Only' },
    includedAmenities: [{ type: String }],
    discountPercentage: { type: Number, default: 0 },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    notes: { type: String, default: '' },
    status: { type: String, required: true, default: 'Active' },
    createdBy: { type: String, required: true, default: 'Manager' },
  },
  { timestamps: true }
);

export const ContractModel: Model<IContract> =
  mongoose.models.Contract || mongoose.model<IContract>('Contract', ContractSchema);
