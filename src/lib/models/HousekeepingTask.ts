import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHousekeepingTask extends Document {
  idNumber: number;
  roomNumber: string;
  taskType: string;
  priority: string;
  assignedStaff: string;
  status: string;
  notes?: string;
  timestamp: string;
  createdAt: Date;
  updatedAt: Date;
}

const HousekeepingTaskSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    roomNumber: { type: String, required: true },
    taskType: { type: String, required: true },
    priority: { type: String, required: true, default: 'Normal' },
    assignedStaff: { type: String, required: true },
    status: { type: String, required: true, default: 'Pending' },
    notes: { type: String, default: '' },
    timestamp: { type: String, required: true },
  },
  { timestamps: true }
);

export const HousekeepingTaskModel: Model<IHousekeepingTask> =
  mongoose.models.HousekeepingTask || mongoose.model<IHousekeepingTask>('HousekeepingTask', HousekeepingTaskSchema);
