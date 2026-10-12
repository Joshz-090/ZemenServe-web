import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyReport extends Document {
  date: string; // 'YYYY-MM-DD'
  totalRevenue: number;
  totalCogs: number;
  netProfit: number;
  totalOrders: number;
  roomRevenue: number;
  foodRevenue: number;
  otherRevenue: number;
  totalLodgingBookings: number;
  roomSales: {
    reservationId: number;
    bookingRef: string;
    roomNumber: string;
    roomType: string;
    guestName: string;
    guestPhone?: string;
    idNumber?: string;
    idType?: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    rate: number;
    total: number;
    depositPaid: number;
    balanceDue: number;
    mealPlan?: string;
    paymentStatus: string;
    status: string;
  }[];
  itemsSold: {
    menuItemId: number;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
}

const DailyReportSchema: Schema = new Schema(
  {
    date: { type: String, required: true, unique: true },
    totalRevenue: { type: Number, required: true, default: 0 },
    totalCogs: { type: Number, required: true, default: 0 },
    netProfit: { type: Number, required: true, default: 0 },
    totalOrders: { type: Number, required: true, default: 0 },
    roomRevenue: { type: Number, required: true, default: 0 },
    foodRevenue: { type: Number, required: true, default: 0 },
    otherRevenue: { type: Number, required: true, default: 0 },
    totalLodgingBookings: { type: Number, required: true, default: 0 },
    roomSales: [
      {
        reservationId: { type: Number },
        bookingRef: { type: String },
        roomNumber: { type: String },
        roomType: { type: String },
        guestName: { type: String },
        guestPhone: { type: String },
        idNumber: { type: String },
        idType: { type: String },
        checkInDate: { type: String },
        checkOutDate: { type: String },
        nights: { type: Number },
        rate: { type: Number },
        total: { type: Number },
        depositPaid: { type: Number },
        balanceDue: { type: Number },
        mealPlan: { type: String },
        paymentStatus: { type: String },
        status: { type: String },
      },
    ],
    itemsSold: [
      {
        menuItemId: { type: Number, required: true },
        name: { type: String, required: true },
        category: { type: String, required: true, default: 'General' },
        quantity: { type: Number, required: true, default: 0 },
        revenue: { type: Number, required: true, default: 0 },
        cost: { type: Number, required: true, default: 0 },
        profit: { type: Number, required: true, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const DailyReportModel: Model<IDailyReport> =
  mongoose.models.DailyReport || mongoose.model<IDailyReport>('DailyReport', DailyReportSchema);
