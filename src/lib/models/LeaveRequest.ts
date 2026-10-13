import mongoose, { Schema, Document, Model } from 'mongoose';

export type LeaveType =
  | 'Annual Leave'
  | 'Sick Leave'
  | 'Emergency Leave'
  | 'Unpaid Leave'
  | 'Maternity / Paternity'
  | 'Compensatory Off';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface ILeaveRequest extends Document {
  idNumber: number;
  requestCode: string;
  employeeId: number;
  staffCode: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewDate?: string;
  reviewComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    requestCode: { type: String, required: true, unique: true, index: true },
    employeeId: { type: Number, required: true, index: true },
    staffCode: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true, index: true },
    leaveType: {
      type: String,
      required: true,
      enum: [
        'Annual Leave',
        'Sick Leave',
        'Emergency Leave',
        'Unpaid Leave',
        'Maternity / Paternity',
        'Compensatory Off',
      ],
    },
    startDate: { type: String, required: true, index: true },
    endDate: { type: String, required: true, index: true },
    totalDays: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      required: true,
      default: 'Pending',
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      index: true,
    },
    reviewedBy: { type: String },
    reviewDate: { type: String },
    reviewComment: { type: String },
  },
  { timestamps: true }
);

export const LeaveRequestModel: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest || mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
