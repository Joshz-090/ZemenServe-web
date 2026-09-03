import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { MenuItemModel } from '@/lib/models/MenuItem';
import { CategoryModel } from '@/lib/models/Category';

const INITIAL_CATEGORIES = [
  { idNumber: 1, name: 'Traditional Dishes', isActive: true },
  { idNumber: 2, name: 'Western / Fast Food', isActive: true },
  { idNumber: 3, name: 'Beverages', isActive: true },
  { idNumber: 4, name: 'Desserts & Snacks', isActive: true },
];

const INITIAL_MENU_ITEMS = [
  { idNumber: 1, name: 'Special Beef Tibs', category: 'Traditional Dishes', price: 480.0, isActive: true, recipes: [{ ingredientId: 1, quantityRequired: 0.35 }, { ingredientId: 3, quantityRequired: 0.10 }, { ingredientId: 5, quantityRequired: 0.05 }] },
  { idNumber: 2, name: 'Doro Wot', category: 'Traditional Dishes', price: 550.0, isActive: true, recipes: [{ ingredientId: 2, quantityRequired: 0.25 }, { ingredientId: 3, quantityRequired: 0.20 }, { ingredientId: 4, quantityRequired: 0.04 }, { ingredientId: 5, quantityRequired: 0.04 }] },
  { idNumber: 3, name: 'Shiro Tegabeno', category: 'Traditional Dishes', price: 250.0, isActive: true, recipes: [{ ingredientId: 6, quantityRequired: 0.12 }, { ingredientId: 3, quantityRequired: 0.05 }, { ingredientId: 5, quantityRequired: 0.03 }] },
  { idNumber: 4, name: 'Veggie Beyaynetu', category: 'Traditional Dishes', price: 280.0, isActive: true, recipes: [] },
  { idNumber: 5, name: 'Special Cheese Burger', category: 'Western / Fast Food', price: 380.0, isActive: true, recipes: [{ ingredientId: 1, quantityRequired: 0.20 }, { ingredientId: 7, quantityRequired: 1.0 }, { ingredientId: 8, quantityRequired: 1.0 }] },
  { idNumber: 6, name: 'Club Sandwich', category: 'Western / Fast Food', price: 340.0, isActive: true, recipes: [] },
  { idNumber: 7, name: 'Ethiopian Coffee (Buna)', category: 'Beverages', price: 35.0, isActive: true, recipes: [{ ingredientId: 9, quantityRequired: 0.02 }] },
  { idNumber: 8, name: 'Macchiato', category: 'Beverages', price: 50.0, isActive: true, recipes: [{ ingredientId: 9, quantityRequired: 0.02 }, { ingredientId: 10, quantityRequired: 0.15 }] },
  { idNumber: 9, name: 'Coca Cola / Fanta / Sprite', category: 'Beverages', price: 45.0, isActive: true, recipes: [{ ingredientId: 11, quantityRequired: 1.0 }] },
  { idNumber: 10, name: 'Ambo Mineral Water', category: 'Beverages', price: 35.0, isActive: true, recipes: [{ ingredientId: 12, quantityRequired: 1.0 }] },
];

// GET: Fetch all menu items & categories from database
export async function GET() {
  try {
    await connectToDatabase();

    // Auto-seed categories if collection is empty
    const catCount = await CategoryModel.countDocuments();
    if (catCount === 0) {
      await CategoryModel.insertMany(INITIAL_CATEGORIES, { ordered: false }).catch(() => {});
    }

    // Auto-seed menu items if collection is empty
    const menuCount = await MenuItemModel.countDocuments();
    if (menuCount === 0) {
      await MenuItemModel.insertMany(INITIAL_MENU_ITEMS, { ordered: false }).catch(() => {});
    }

    const [catDocs, menuDocs] = await Promise.all([
      CategoryModel.find().sort({ idNumber: 1 }).lean(),
      MenuItemModel.find().sort({ idNumber: 1 }).lean(),
    ]);

    const categories = catDocs.map((doc: any) => ({
      id: doc.idNumber,
      name: doc.name,
      isActive: doc.isActive,
    }));

    const menuItems = menuDocs.map((doc: any) => ({
      id: doc.idNumber,
      name: doc.name,
      category: doc.category,
      price: doc.price,
      imagePath: doc.imagePath,
      isActive: doc.isActive,
      recipes: (doc.recipes || []).map((r: any, idx: number) => ({
        id: idx + 1,
        menuItemId: doc.idNumber,
        ingredientId: r.ingredientId,
        quantityRequired: r.quantityRequired,
      })),
    }));

    return NextResponse.json({ success: true, categories, menuItems });
  } catch (error: any) {
    console.error('Database Menu GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch menu items from database' },
      { status: 500 }
    );
  }
}

// POST: Add new menu item to database
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { name, category, price, recipes } = body;
    if (!name || !category || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, category, and price are required' },
        { status: 400 }
      );
    }

    const lastDoc = await MenuItemModel.findOne().sort({ idNumber: -1 }).lean();
    const nextId = lastDoc && lastDoc.idNumber ? lastDoc.idNumber + 1 : 1;

    const newItem = await MenuItemModel.create({
      idNumber: nextId,
      name,
      category,
      price: Number(price),
      isActive: true,
      recipes: recipes || [],
    });

    return NextResponse.json({
      success: true,
      menuItem: {
        id: newItem.idNumber,
        name: newItem.name,
        category: newItem.category,
        price: newItem.price,
        imagePath: newItem.imagePath,
        isActive: newItem.isActive,
        recipes: newItem.recipes.map((r: any, idx: number) => ({
          id: idx + 1,
          menuItemId: newItem.idNumber,
          ingredientId: r.ingredientId,
          quantityRequired: r.quantityRequired,
        })),
      },
    });
  } catch (error: any) {
    console.error('Database Menu POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create menu item in database' },
      { status: 500 }
    );
  }
}

// PUT: Edit menu item or toggle active status in database
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { id, name, category, price, isActive, recipes } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Menu item ID is required' }, { status: 400 });
    }

    const item = await MenuItemModel.findOne({ idNumber: Number(id) });
    if (!item) {
      return NextResponse.json({ success: false, error: 'Menu item not found in database' }, { status: 404 });
    }

    if (name) item.name = name;
    if (category) item.category = category;
    if (price !== undefined) item.price = Number(price);
    if (isActive !== undefined) item.isActive = Boolean(isActive);
    if (recipes && Array.isArray(recipes)) item.recipes = recipes;

    await item.save();

    return NextResponse.json({
      success: true,
      menuItem: {
        id: item.idNumber,
        name: item.name,
        category: item.category,
        price: item.price,
        imagePath: item.imagePath,
        isActive: item.isActive,
        recipes: item.recipes.map((r: any, idx: number) => ({
          id: idx + 1,
          menuItemId: item.idNumber,
          ingredientId: r.ingredientId,
          quantityRequired: r.quantityRequired,
        })),
      },
    });
  } catch (error: any) {
    console.error('Database Menu PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update menu item in database' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a menu item from database
export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Menu item ID is required' }, { status: 400 });
    }

    await MenuItemModel.findOneAndDelete({ idNumber: Number(id) });
    return NextResponse.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error: any) {
    console.error('Database Menu DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete menu item from database' },
      { status: 500 }
    );
  }
}
