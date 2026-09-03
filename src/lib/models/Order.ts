import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  idNumber: number;
  orderIdNumber: number;
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  unitPriceAtSale: number;
}

export interface IOrder extends Document {
  idNumber: number;
  createdAt: Date;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Paid' | 'Cancelled';
  totalAmount: number;
  cashierNote?: string;
  waiterId?: number;
  waiterName?: string;
  isPaid: boolean;
  paymentMethod?: string;
  cancelReason?: string;
  orderItems: IOrderItem[];
  updatedAt: Date;
}

const OrderItemSchema = new Schema({
  idNumber: { type: Number, required: true },
  orderIdNumber: { type: Number, required: true },
  menuItemId: { type: Number, required: true },
  menuItemName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPriceAtSale: { type: Number, required: true, default: 0 },
});

const OrderSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Preparing', 'Ready', 'Served', 'Paid', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    totalAmount: { type: Number, required: true, default: 0 },
    cashierNote: { type: String, default: '' },
    waiterId: { type: Number },
    waiterName: { type: String, default: 'Staff' },
    isPaid: { type: Boolean, required: true, default: false, index: true },
    paymentMethod: { type: String },
    cancelReason: { type: String },
    orderItems: [OrderItemSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
OrderSchema.index({ createdAt: -1 });

export const OrderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
