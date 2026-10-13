import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document {
  id: string;
  seq: number;
}

const CounterSchema = new Schema({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const CounterModel: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

/**
 * Atomically increments and returns the next sequential integer ID for a given sequence key.
 * This guarantees concurrency safety under high parallel traffic (MongoDB atomic $inc).
 */
export async function getNextSequenceValue(sequenceKey: string, fallbackMaxId?: number): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate(
    { id: sequenceKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // If initial sequence is below existing max ID in DB, adjust sequence to prevent collisions
  if (fallbackMaxId && counter.seq < fallbackMaxId) {
    const adjusted = await CounterModel.findOneAndUpdate(
      { id: sequenceKey, seq: { $lt: fallbackMaxId } },
      { $set: { seq: fallbackMaxId } },
      { new: true }
    );
    return adjusted ? adjusted.seq : counter.seq;
  }

  return counter.seq;
}
