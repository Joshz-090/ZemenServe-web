import mongoose, { Schema, Document, Model } from 'mongoose';

export type AttendanceStatus =
  | 'Present'
  | 'Late'
  | 'Early Departure'
  | 'Absent'
  | 'On Leave'
  | 'Missed Clock-Out'
  | 'Overtime';

export interface IAttendanceRecord extends Document {
  idNumber: number;
  employeeId: number;
  staffCode: string;
  employeeName: string;
  department: string;
  date: string; // YYYY-MM-DD
  shiftId?: number;
  clockInTime?: string; // HH:mm:ss
  clockOutTime?: string; // HH:mm:ss
  breakMinutes: number;
  scheduledHours: number;
  actualHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  isManuallyCorrected: boolean;
  correctionReason?: string;
  correctedBy?: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    employeeId: { type: Number, required: true, index: true },
    staffCode: { type: String, required: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    shiftId: { type: Number },
    clockInTime: { type: String },
    clockOutTime: { type: String },
    breakMinutes: { type: Number, default: 0 },
    scheduledHours: { type: Number, default: 8 },
    actualHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      default: 'Present',
      enum: ['Present', 'Late', 'Early Departure', 'Absent', 'On Leave', 'Missed Clock-Out', 'Overtime'],
      index: true,
    },
    isManuallyCorrected: { type: Boolean, default: false },
    correctionReason: { type: String },
    correctedBy: { type: String },
    approvedBy: { type: String },
  },
  { timestamps: true }
);

AttendanceRecordSchema.index({ date: 1, employeeId: 1 }, { unique: true });

export const AttendanceRecordModel: Model<IAttendanceRecord> =
  mongoose.models.AttendanceRecord || mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
