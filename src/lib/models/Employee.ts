import mongoose, { Schema, Document, Model } from 'mongoose';

export type EmployeeType = 'Full-time' | 'Part-time' | 'Casual' | 'Contract' | 'Intern';
export type EmploymentStatus = 'Active' | 'On Leave' | 'Suspended' | 'Terminated';

export interface IEmployee extends Document {
  idNumber: number;
  staffCode: string;
  fullName: string;
  photoUrl?: string;
  nationality: string;
  phone: string;
  altPhone?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  department: string;
  jobTitle: string;
  employeeType: EmployeeType;
  startDate: string;
  contractEndDate?: string;
  status: EmploymentStatus;
  supervisorName?: string;
  location: string;
  normalWeeklyHours: number;
  salary?: number; // Restricted to Admin/Manager
  notes?: string;
  idType?: string;
  idNumberDoc?: string;
  idExpiryDate?: string;
  workPermitNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    staffCode: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true, index: true },
    photoUrl: { type: String },
    nationality: { type: String, default: 'Ethiopian' },
    phone: { type: String, required: true },
    altPhone: { type: String },
    email: { type: String },
    gender: { type: String },
    dateOfBirth: { type: String },
    address: { type: String },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' },
    },
    department: { type: String, required: true, index: true },
    jobTitle: { type: String, required: true, index: true },
    employeeType: {
      type: String,
      required: true,
      default: 'Full-time',
      enum: ['Full-time', 'Part-time', 'Casual', 'Contract', 'Intern'],
    },
    startDate: { type: String, required: true },
    contractEndDate: { type: String },
    status: {
      type: String,
      required: true,
      default: 'Active',
      enum: ['Active', 'On Leave', 'Suspended', 'Terminated'],
      index: true,
    },
    supervisorName: { type: String, default: '' },
    location: { type: String, default: 'Main Hotel Complex' },
    normalWeeklyHours: { type: Number, default: 48 },
    salary: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    idType: { type: String, default: 'National ID' },
    idNumberDoc: { type: String },
    idExpiryDate: { type: String },
    workPermitNumber: { type: String },
  },
  { timestamps: true }
);

export const EmployeeModel: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
