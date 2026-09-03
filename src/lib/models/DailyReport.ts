import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyReport extends Document {
  date: string; // 'YYYY-MM-DD'
  totalRevenue: number;
  totalCogs: number;
  netProfit: number;
  totalOrders: number;
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
