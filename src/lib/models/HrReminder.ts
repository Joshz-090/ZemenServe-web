import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHrReminder extends Document {
  idNumber: number;
  title: string;
  description: string;
  category: 'Operational' | 'Staff Meeting' | 'Event Prep' | 'Compliance' | 'Maintenance' | 'General';
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  targetDepartment?: string;
  assignedToName?: string;
  isCompleted: boolean;
  relatedEventId?: number;
  relatedEventTitle?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const HrReminderSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      required: true,
      default: 'Operational',
      enum: ['Operational', 'Staff Meeting', 'Event Prep', 'Compliance', 'Maintenance', 'General'],
    },
    date: { type: String, required: true, index: true },
    time: { type: String },
    priority: {
      type: String,
      required: true,
      default: 'Normal',
      enum: ['Low', 'Normal', 'High', 'Urgent'],
    },
    targetDepartment: { type: String },
    assignedToName: { type: String },
    isCompleted: { type: Boolean, default: false, index: true },
    relatedEventId: { type: Number },
    relatedEventTitle: { type: String },
    createdBy: { type: String, default: 'Manager' },
  },
  { timestamps: true }
);

export const HrReminderModel: Model<IHrReminder> =
  mongoose.models.HrReminder || mongoose.model<IHrReminder>('HrReminder', HrReminderSchema);
