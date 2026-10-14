import mongoose, { Schema, Document, Model } from 'mongoose';

export type DrawerStation = 'Front Desk' | 'Restaurant' | 'Bar' | 'Main Safe' | 'Banquet';
export type DrawerStatus = 'Active' | 'Inactive' | 'In_Use';

export interface ICashDrawer extends Document {
  drawerId: string;
  name: string;
  station: DrawerStation;
  glAccountCode: string; // e.g. '1010', '1020', '1030'
  currentBalance: number; // in ETB
  currency: string; // 'ETB'
  status: DrawerStatus;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  activeShiftNumber?: string | null;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashDrawerSchema = new Schema<ICashDrawer>(
  {
    drawerId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    station: {
      type: String,
      required: true,
      enum: ['Front Desk', 'Restaurant', 'Bar', 'Main Safe', 'Banquet'],
      default: 'Front Desk',
    },
    glAccountCode: { type: String, required: true, trim: true, default: '1010' },
    currentBalance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'ETB', uppercase: true },
    status: {
      type: String,
      required: true,
      enum: ['Active', 'Inactive', 'In_Use'],
      default: 'Active',
    },
    assignedUserId: { type: String, default: null },
    assignedUserName: { type: String, default: null },
    activeShiftNumber: { type: String, default: null },
    location: { type: String, default: 'Lobby Register' },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const CashDrawerModel: Model<ICashDrawer> =
  mongoose.models.CashDrawer || mongoose.model<ICashDrawer>('CashDrawer', CashDrawerSchema);
