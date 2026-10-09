import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventBooking extends Document {
  idNumber: number;
  bookingRef: string;
  eventTitle: string;
  organizerName: string;
  organizerContact: string;
  hallId: number;
  hallName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  expectedAttendees: number;
  setupFormat: string;
  cateringPackage?: string;
  totalAmount: number;
  depositPaid: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventBookingSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    bookingRef: { type: String, required: true, unique: true },
    eventTitle: { type: String, required: true },
    organizerName: { type: String, required: true },
    organizerContact: { type: String, required: true },
    hallId: { type: Number, required: true },
    hallName: { type: String, required: true },
    eventDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    expectedAttendees: { type: Number, required: true },
    setupFormat: { type: String, required: true, default: 'Banquet' },
    cateringPackage: { type: String, default: 'Standard Buffet' },
    totalAmount: { type: Number, required: true },
    depositPaid: { type: Number, default: 0 },
    status: { type: String, default: 'Confirmed' },
  },
  { timestamps: true }
);

export const EventBookingModel: Model<IEventBooking> =
  mongoose.models.EventBooking || mongoose.model<IEventBooking>('EventBooking', EventBookingSchema);
