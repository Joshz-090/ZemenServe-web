import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDutyAssignment extends Document {
  idNumber: number;
  dutyCode: string;
  title: string;
  instructions: string;
  department: string;
  employeeId?: number;
  employeeName: string;
  date: string;
  time?: string;
  location: string;
  shiftId?: number;
  relatedEventId?: number;
  relatedEventTitle?: string;
  supervisor: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  completionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DutyAssignmentSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    dutyCode: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: '' },
    department: { type: String, required: true, index: true },
    employeeId: { type: Number },
    employeeName: { type: String, required: true },
    date: { type: String, required: true, index: true },
    time: { type: String },
    location: { type: String, default: 'Main Hotel Complex' },
    shiftId: { type: Number },
    relatedEventId: { type: Number },
    relatedEventTitle: { type: String },
    supervisor: { type: String, default: 'Manager' },
    priority: {
      type: String,
      required: true,
      default: 'Normal',
      enum: ['Low', 'Normal', 'High', 'Urgent'],
    },
    status: {
      type: String,
      required: true,
      default: 'Assigned',
      enum: ['Assigned', 'In Progress', 'Completed', 'Cancelled'],
      index: true,
    },
    completionNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

DutyAssignmentSchema.index({ date: 1, department: 1, status: 1 });

export const DutyAssignmentModel: Model<IDutyAssignment> =
  mongoose.models.DutyAssignment || mongoose.model<IDutyAssignment>('DutyAssignment', DutyAssignmentSchema);
