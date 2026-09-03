import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventoryLog extends Document {
  idNumber: number;
  ingredientId: number;
  ingredientName: string;
  changeAmount: number;
  reason: string;
  timestamp: string;
}

const InventoryLogSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    ingredientId: { type: Number, required: true },
    ingredientName: { type: String, required: true },
    changeAmount: { type: Number, required: true },
    reason: { type: String, required: true, default: 'Inventory Change' },
    timestamp: { type: String, required: true, default: () => new Date().toISOString() },
  },
  {
    timestamps: true,
  }
);

export const InventoryLogModel: Model<IInventoryLog> =
  mongoose.models.InventoryLog || mongoose.model<IInventoryLog>('InventoryLog', InventoryLogSchema);
