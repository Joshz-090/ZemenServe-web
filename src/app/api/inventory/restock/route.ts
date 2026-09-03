import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { IngredientModel } from '@/lib/models/Ingredient';
import { InventoryLogModel } from '@/lib/models/InventoryLog';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { id, quantity, reason, newCostPerUnit } = body;
    const qty = Number(quantity);

    if (!id || isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, error: 'Valid ingredient ID and quantity are required' }, { status: 400 });
    }

    const ing = await IngredientModel.findOne({ idNumber: Number(id) });
    if (!ing) {
      return NextResponse.json({ success: false, error: 'Ingredient not found in database' }, { status: 404 });
    }

    // Atomic update in database
    ing.stockQuantity += qty;
    
    // Update cost per unit if cost difference specified
    let logNote = reason || 'Stock Restock';
    if (newCostPerUnit !== undefined && newCostPerUnit !== null && !isNaN(Number(newCostPerUnit))) {
      const oldCost = ing.costPerUnit;
      const newCost = Number(newCostPerUnit);
      if (oldCost !== newCost) {
        ing.costPerUnit = newCost;
        logNote = `[Unit Cost: ETB ${oldCost.toFixed(2)} ➔ ETB ${newCost.toFixed(2)}] ${logNote}`;
      }
    }

    await ing.save();

    // Log the transaction in database
    const maxLogDoc = await InventoryLogModel.findOne().sort({ idNumber: -1 });
    const nextLogId = maxLogDoc ? maxLogDoc.idNumber + 1 : 1;

    const log = await InventoryLogModel.create({
      idNumber: nextLogId,
      ingredientId: ing.idNumber,
      ingredientName: ing.name,
      changeAmount: qty,
      reason: reason || 'Stock Restock',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      ingredient: {
        id: ing.idNumber,
        name: ing.name,
        unit: ing.unit,
        costPerUnit: ing.costPerUnit,
        stockQuantity: ing.stockQuantity,
        lowStockThreshold: ing.lowStockThreshold,
      },
      log: {
        id: log.idNumber,
        ingredientId: log.ingredientId,
        ingredientName: log.ingredientName,
        changeAmount: log.changeAmount,
        reason: log.reason,
        timestamp: log.timestamp,
      },
    });
  } catch (error: any) {
    console.error('Database Restock POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to restock ingredient in database' },
      { status: 500 }
    );
  }
}
