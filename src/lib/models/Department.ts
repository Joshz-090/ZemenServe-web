import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDepartment extends Document {
  idNumber: number;
  code: string;
  name: string;
  managerName?: string;
  description: string;
  minStaffPerShift: {
    morning: number;
    evening: number;
    night: number;
    general: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    managerName: { type: String, default: '' },
    description: { type: String, default: '' },
    minStaffPerShift: {
      morning: { type: Number, default: 2 },
      evening: { type: Number, default: 2 },
      night: { type: Number, default: 1 },
      general: { type: Number, default: 1 },
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const DepartmentModel: Model<IDepartment> =
  mongoose.models.Department || mongoose.model<IDepartment>('Department', DepartmentSchema);
