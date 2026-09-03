import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { IngredientModel } from '@/lib/models/Ingredient';

const INITIAL_INGREDIENTS = [
  { idNumber: 1, name: 'Beef Meat', unit: 'kg', costPerUnit: 450.0, stockQuantity: 25.0, lowStockThreshold: 5.0 },
  { idNumber: 2, name: 'Whole Chicken', unit: 'pcs', costPerUnit: 600.0, stockQuantity: 15.0, lowStockThreshold: 3.0 },
  { idNumber: 3, name: 'Onions', unit: 'kg', costPerUnit: 60.0, stockQuantity: 50.0, lowStockThreshold: 10.0 },
  { idNumber: 4, name: 'Berbere Spice', unit: 'kg', costPerUnit: 350.0, stockQuantity: 10.0, lowStockThreshold: 2.0 },
  { idNumber: 5, name: 'Niter Kibbeh (Clarified Butter)', unit: 'kg', costPerUnit: 700.0, stockQuantity: 8.0, lowStockThreshold: 2.0 },
  { idNumber: 6, name: 'Shiro Powder', unit: 'kg', costPerUnit: 250.0, stockQuantity: 20.0, lowStockThreshold: 4.0 },
  { idNumber: 7, name: 'Burger Buns', unit: 'pcs', costPerUnit: 25.0, stockQuantity: 40.0, lowStockThreshold: 10.0 },
  { idNumber: 8, name: 'Cheese Slices', unit: 'pcs', costPerUnit: 35.0, stockQuantity: 50.0, lowStockThreshold: 10.0 },
  { idNumber: 9, name: 'Ethiopian Roasted Coffee Beans', unit: 'kg', costPerUnit: 500.0, stockQuantity: 12.0, lowStockThreshold: 2.5 },
  { idNumber: 10, name: 'Fresh Milk', unit: 'L', costPerUnit: 75.0, stockQuantity: 30.0, lowStockThreshold: 5.0 },
  { idNumber: 11, name: 'Soft Drink 330ml Bottle', unit: 'pcs', costPerUnit: 30.0, stockQuantity: 120.0, lowStockThreshold: 20.0 },
  { idNumber: 12, name: 'Ambo Mineral Water 500ml', unit: 'pcs', costPerUnit: 25.0, stockQuantity: 100.0, lowStockThreshold: 15.0 },
];

export async function GET() {
  try {
    await connectToDatabase();
    let count = await IngredientModel.countDocuments();

    // Auto-seed if database collection is empty
    if (count === 0) {
      try {
        await IngredientModel.insertMany(INITIAL_INGREDIENTS, { ordered: false });
        console.log('Seeded initial ingredients to Database');
      } catch (seedErr) {
        console.log('Seeding notice (some items may already exist):', seedErr);
      }
    }

    const docs = await IngredientModel.find().sort({ idNumber: 1 }).lean();
    const ingredients = docs.map((doc: any) => ({
      id: doc.idNumber,
      name: doc.name,
      unit: doc.unit,
      costPerUnit: doc.costPerUnit,
      stockQuantity: doc.stockQuantity,
      lowStockThreshold: doc.lowStockThreshold,
    }));

    return NextResponse.json({ success: true, ingredients });
  } catch (error: any) {
    console.error('Database Inventory GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch inventory from database' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { name, unit, costPerUnit, stockQuantity, lowStockThreshold } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Ingredient name is required' }, { status: 400 });
    }

    // Determine highest idNumber
    const maxDoc = await IngredientModel.findOne().sort({ idNumber: -1 });
    const nextId = maxDoc ? maxDoc.idNumber + 1 : 1;

    const newIng = await IngredientModel.create({
      idNumber: nextId,
      name,
      unit: unit || 'kg',
      costPerUnit: Number(costPerUnit) || 0,
      stockQuantity: Number(stockQuantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
    });

    return NextResponse.json({
      success: true,
      ingredient: {
        id: newIng.idNumber,
        name: newIng.name,
        unit: newIng.unit,
        costPerUnit: newIng.costPerUnit,
        stockQuantity: newIng.stockQuantity,
        lowStockThreshold: newIng.lowStockThreshold,
      },
    });
  } catch (error: any) {
    console.error('Database Inventory POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create ingredient in database' },
      { status: 500 }
    );
  }
}

// PUT: Edit ingredient details (name, unit, costPerUnit, stockQuantity, threshold)
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, name, unit, costPerUnit, stockQuantity, lowStockThreshold } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ingredient ID is required' }, { status: 400 });
    }

    const ing = await IngredientModel.findOne({ idNumber: Number(id) });
    if (!ing) {
      return NextResponse.json({ success: false, error: 'Ingredient not found' }, { status: 404 });
    }

    if (name) ing.name = name;
    if (unit) ing.unit = unit;
    if (costPerUnit !== undefined) ing.costPerUnit = Number(costPerUnit);
    if (stockQuantity !== undefined) ing.stockQuantity = Number(stockQuantity);
    if (lowStockThreshold !== undefined) ing.lowStockThreshold = Number(lowStockThreshold);

    await ing.save();

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
    });
  } catch (error: any) {
    console.error('Database Inventory PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete an ingredient from inventory
export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ingredient ID is required' }, { status: 400 });
    }

    await IngredientModel.findOneAndDelete({ idNumber: Number(id) });
    return NextResponse.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error: any) {
    console.error('Database Inventory DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
