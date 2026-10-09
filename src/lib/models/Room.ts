import mongoose, { Schema, Document, Model } from 'mongoose';
import { RoomStatus, RoomType } from '../types';

export interface IRoom extends Document {
  idNumber: number;
  roomNumber: string;
  type: RoomType;
  floor: number;
  pricePerNight: number;
  capacity: number;
  status: RoomStatus;
  amenities: string[];
  currentGuestName?: string;
  currentReservationId?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    roomNumber: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    floor: { type: Number, required: true },
    pricePerNight: { type: Number, required: true },
    capacity: { type: Number, required: true, default: 2 },
    status: { type: String, required: true, default: 'Clean' },
    amenities: [{ type: String }],
    currentGuestName: { type: String },
    currentReservationId: { type: Number },
  },
  { timestamps: true }
);

export const RoomModel: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
