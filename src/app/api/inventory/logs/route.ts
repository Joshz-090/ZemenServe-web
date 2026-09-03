import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { InventoryLogModel } from '@/lib/models/InventoryLog';

export async function GET() {
  try {
    await connectToDatabase();
    const docs = await InventoryLogModel.find().sort({ createdAt: -1 }).limit(100);

    const logs = docs.map((doc: any) => ({
      id: doc.idNumber,
      ingredientId: doc.ingredientId,
      ingredientName: doc.ingredientName,
      changeAmount: doc.changeAmount,
      reason: doc.reason,
      timestamp: doc.timestamp,
    }));

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Database Inventory Logs GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch inventory logs from database' },
      { status: 500 }
    );
  }
}
