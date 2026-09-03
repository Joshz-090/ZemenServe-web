import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIngredient extends Document {
  idNumber: number;
  name: string;
  unit: string;
  costPerUnit: number;
  stockQuantity: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, default: 'kg' },
    costPerUnit: { type: Number, required: true, default: 0 },
    stockQuantity: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, required: true, default: 5 },
  },
  {
    timestamps: true,
  }
);

export const IngredientModel: Model<IIngredient> =
  mongoose.models.Ingredient || mongoose.model<IIngredient>('Ingredient', IngredientSchema);
