import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  idNumber: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
  }
);

export const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
