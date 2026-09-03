import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  idNumber: number;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    idNumber: { type: Number, required: true, unique: true, index: true },
    timestamp: { type: String, required: true },
    user: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    details: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ createdAt: -1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
