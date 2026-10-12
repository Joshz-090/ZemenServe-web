import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQualification extends Document {
  idNumber: number;
  employeeId: number;
  staffCode: string;
  employeeName: string;
  title: string;
  category: string;
  issuingBody: string;
  issueDate: string;
  expiryDate?: string;
  certificateNumber?: string;
  verificationStatus: 'Verified' | 'Pending Verification' | 'Expired';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QualificationSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    employeeId: { type: Number, required: true, index: true },
    staffCode: { type: String, required: true },
    employeeName: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'General' },
    issuingBody: { type: String, required: true },
    issueDate: { type: String, required: true },
    expiryDate: { type: String },
    certificateNumber: { type: String, default: '' },
    verificationStatus: {
      type: String,
      required: true,
      default: 'Verified',
      enum: ['Verified', 'Pending Verification', 'Expired'],
      index: true,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const QualificationModel: Model<IQualification> =
  mongoose.models.Qualification || mongoose.model<IQualification>('Qualification', QualificationSchema);
