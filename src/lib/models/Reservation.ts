import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReservation extends Document {
  idNumber: number;
  bookingRef: string;
  guestId: number;
  guestName: string;
  guestPhone: string;
  roomId: number;
  roomNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  numberOfGuests: number;
  status: string;
  bookingSource: string;
  nightlyRate: number;
  totalAmount: number;
  depositPaid: number;
  paymentStatus: string;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    bookingRef: { type: String, required: true, unique: true },
    guestId: { type: Number, required: true },
    guestName: { type: String, required: true },
    guestPhone: { type: String, required: true },
    roomId: { type: Number, required: true },
    roomNumber: { type: String, required: true },
    roomType: { type: String, required: true },
    checkInDate: { type: String, required: true },
    checkOutDate: { type: String, required: true },
    nights: { type: Number, required: true, default: 1 },
    numberOfGuests: { type: Number, default: 1 },
    status: { type: String, required: true, default: 'Reserved' },
    bookingSource: { type: String, default: 'Direct Walk-in' },
    nightlyRate: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    depositPaid: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'Pending' },
    specialRequests: { type: String, default: '' },
  },
  { timestamps: true }
);

export const ReservationModel: Model<IReservation> =
  mongoose.models.Reservation || mongoose.model<IReservation>('Reservation', ReservationSchema);
