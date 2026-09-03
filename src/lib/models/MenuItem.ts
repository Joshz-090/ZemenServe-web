import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRecipeItem {
  ingredientId: number;
  quantityRequired: number;
}

export interface IMenuItem extends Document {
  idNumber: number;
  name: string;
  category: string;
  price: number;
  imagePath?: string;
  isActive: boolean;
  recipes: IRecipeItem[];
  createdAt: Date;
  updatedAt: Date;
}

const RecipeItemSchema = new Schema({
  ingredientId: { type: Number, required: true },
  quantityRequired: { type: Number, required: true, default: 0 },
});

const MenuItemSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, default: 0 },
    imagePath: { type: String, default: '' },
    isActive: { type: Boolean, required: true, default: true, index: true },
    recipes: [RecipeItemSchema],
  },
  {
    timestamps: true,
  }
);

export const MenuItemModel: Model<IMenuItem> =
  mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
