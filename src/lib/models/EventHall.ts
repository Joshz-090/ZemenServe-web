import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventHall extends Document {
  idNumber: number;
  name: string;
  hallType: string;
  capacity: number;
  hourlyRate: number;
  dailyRate: number;
  location?: string;
  amenities: string[];
  description?: string;
  status: 'Available' | 'Maintenance' | 'Booked';
  createdAt: Date;
  updatedAt: Date;
}

const EventHallSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    hallType: { type: String, required: true, default: 'Conference Hall' },
    capacity: { type: Number, required: true },
    hourlyRate: { type: Number, required: true, default: 0 },
    dailyRate: { type: Number, required: true },
    location: { type: String, default: 'Main Complex' },
    amenities: [{ type: String }],
    description: { type: String, default: '' },
    status: { type: String, required: true, default: 'Available', enum: ['Available', 'Maintenance', 'Booked'] },
  },
  { timestamps: true }
);

export const EventHallModel: Model<IEventHall> =
  mongoose.models.EventHall || mongoose.model<IEventHall>('EventHall', EventHallSchema);
