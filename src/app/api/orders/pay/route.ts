import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { IngredientModel } from '@/lib/models/Ingredient';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { DailyReportModel } from '@/lib/models/DailyReport';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { orderId, paymentMethod, totalAmount, items } = body;

    if (!orderId || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Invalid order payload' }, { status: 400 });
    }

    let calculatedTotalCogs = 0;

    // 1. Process Inventory Deductions & Logs for each item in order
    for (const item of items) {
      const quantity = item.quantity || 1;
      const recipes = item.recipes || [];

      let itemUnitCogs = 0;

      for (const recipe of recipes) {
        const totalDeduction = recipe.quantityRequired * quantity;

        // Deduct from Database IngredientModel
        const ing = await IngredientModel.findOne({ idNumber: recipe.ingredientId });
        if (ing) {
          ing.stockQuantity = Math.max(0, ing.stockQuantity - totalDeduction);
          await ing.save();

          itemUnitCogs += ing.costPerUnit * recipe.quantityRequired;

          // Record Inventory Log in Database
          const lastLog = await InventoryLogModel.findOne().sort({ idNumber: -1 }).lean();
          const nextLogId = lastLog && lastLog.idNumber ? lastLog.idNumber + 1 : Date.now();

          await InventoryLogModel.create({
            idNumber: nextLogId,
            ingredientId: ing.idNumber,
            ingredientName: ing.name,
            changeAmount: -totalDeduction,
            reason: `Order #${orderId} Paid (${quantity}x ${item.name})`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      calculatedTotalCogs += itemUnitCogs * quantity;
    }

    // 2. Update Daily Financial & Sales Report in Database
    const todayDateStr = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    let dailyReport = await DailyReportModel.findOne({ date: todayDateStr });

    const orderRevenue = totalAmount || 0;
    const orderNetProfit = orderRevenue - calculatedTotalCogs;

    if (!dailyReport) {
      dailyReport = new DailyReportModel({
        date: todayDateStr,
        totalRevenue: orderRevenue,
        totalCogs: calculatedTotalCogs,
        netProfit: orderNetProfit,
        totalOrders: 1,
        itemsSold: [],
      });
    } else {
      dailyReport.totalRevenue += orderRevenue;
      dailyReport.totalCogs += calculatedTotalCogs;
      dailyReport.netProfit += orderNetProfit;
      dailyReport.totalOrders += 1;
    }

    // Update itemsSold breakdown in daily report
    for (const item of items) {
      const menuItemId = item.menuItemId || item.id;
      const name = item.name || item.menuItemName;
      const category = item.category || 'General';
      const qty = item.quantity || 1;
      const price = item.unitPrice || item.unitPriceAtSale || (orderRevenue / items.length);

      const itemRev = price * qty;
      const itemCost = (item.unitCost || 0) * qty;
      const itemProf = itemRev - itemCost;

      const existingItem = dailyReport.itemsSold.find((i) => i.menuItemId === menuItemId);
      if (existingItem) {
        existingItem.quantity += qty;
        existingItem.revenue += itemRev;
        existingItem.cost += itemCost;
        existingItem.profit += itemProf;
      } else {
        dailyReport.itemsSold.push({
          menuItemId,
          name,
          category,
          quantity: qty,
          revenue: itemRev,
          cost: itemCost,
          profit: itemProf,
        });
      }
    }

    await dailyReport.save();

    return NextResponse.json({
      success: true,
      message: `Order #${orderId} paid successfully. Database stock deducted & Daily Report updated.`,
      dailyReport: {
        date: dailyReport.date,
        totalRevenue: dailyReport.totalRevenue,
        totalCogs: dailyReport.totalCogs,
        netProfit: dailyReport.netProfit,
        totalOrders: dailyReport.totalOrders,
      },
    });
  } catch (error: any) {
    console.error('Order payment & inventory deduction error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Payment processing failed' }, { status: 500 });
  }
}
