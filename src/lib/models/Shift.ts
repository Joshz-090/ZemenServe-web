import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShiftStaff {
  employeeId: number;
  staffCode: string;
  name: string;
  role: string;
}

export interface IShift extends Document {
  idNumber: number;
  shiftCode: string;
  shiftName: string;
  department: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isOvernight: boolean;
  assignedStaff: IShiftStaff[];
  supervisorName?: string;
  location: string;
  relatedEventId?: number;
  relatedEventTitle?: string;
  status: 'Draft' | 'Published' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    shiftCode: { type: String, required: true, unique: true, index: true },
    shiftName: { type: String, required: true },
    department: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isOvernight: { type: Boolean, default: false },
    assignedStaff: [
      {
        employeeId: { type: Number, required: true },
        staffCode: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, required: true },
      },
    ],
    supervisorName: { type: String, default: '' },
    location: { type: String, default: 'Main Hotel Complex' },
    relatedEventId: { type: Number },
    relatedEventTitle: { type: String },
    status: {
      type: String,
      required: true,
      default: 'Draft',
      enum: ['Draft', 'Published', 'Completed', 'Cancelled'],
      index: true,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

ShiftSchema.index({ date: 1, department: 1 });

export const ShiftModel: Model<IShift> =
  mongoose.models.Shift || mongoose.model<IShift>('Shift', ShiftSchema);
