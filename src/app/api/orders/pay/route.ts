import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';
import { IngredientModel } from '@/lib/models/Ingredient';
import { InventoryLogModel } from '@/lib/models/InventoryLog';
import { DailyReportModel } from '@/lib/models/DailyReport';
import { verifySessionAndRole } from '@/lib/auth';
import { getNextSequenceValue } from '@/lib/models/Counter';
import { getEthiopianLocalDate } from '@/lib/dateUtils';
import { AccountingIntegrationService } from '@/lib/accounting/integration.service';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Cashier', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { orderId, paymentMethod, totalAmount, items, roomNumber, guestName } = body;

    if (!orderId || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Invalid order payload' }, { status: 400 });
    }

    // 1. Idempotency Guard: Verify order exists and is not already paid
    const targetOrder = await OrderModel.findOne({ idNumber: Number(orderId) });
    if (!targetOrder) {
      return NextResponse.json({ success: false, error: `Order #${orderId} not found in database` }, { status: 404 });
    }

    if (targetOrder.isPaid || targetOrder.status === 'Paid') {
      return NextResponse.json(
        {
          success: false,
          error: `Order #${orderId} is already paid. Duplicate payment processing blocked.`,
          isAlreadyPaid: true,
        },
        { status: 409 }
      );
    }

    // 2. Atomic Compare-And-Swap State Transition (Guarantees single execution under concurrent requests)
    const updatedOrder = await OrderModel.findOneAndUpdate(
      { idNumber: Number(orderId), isPaid: false },
      { $set: { isPaid: true, status: 'Paid', paymentMethod: paymentMethod || 'Cash' } },
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        {
          success: false,
          error: `Order #${orderId} was paid concurrently by another request. Payment aborted.`,
          isAlreadyPaid: true,
        },
        { status: 409 }
      );
    }

    let calculatedTotalCogs = 0;

    // 3. Process Atomic Inventory Deductions & Logs for each item in order
    for (const item of items) {
      const quantity = item.quantity || 1;
      const recipes = item.recipes || [];

      let itemUnitCogs = 0;

      for (const recipe of recipes) {
        const totalDeduction = recipe.quantityRequired * quantity;

        // Atomic stock decrement in database
        const ing = await IngredientModel.findOneAndUpdate(
          { idNumber: recipe.ingredientId },
          { $inc: { stockQuantity: -totalDeduction } },
          { new: true }
        );

        if (ing) {
          itemUnitCogs += ing.costPerUnit * recipe.quantityRequired;

          // Record Inventory Log in Database atomically
          const lastLog = await InventoryLogModel.findOne().sort({ idNumber: -1 }).lean();
          const fallbackMaxId = lastLog && lastLog.idNumber ? lastLog.idNumber + 1 : 1;
          const nextLogId = await getNextSequenceValue('inventoryLogId', fallbackMaxId);

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

    // 4. Update Daily Financial & Sales Report in Database (Ethiopian UTC+3 Local Date)
    const todayDateStr = getEthiopianLocalDate();
    let dailyReport = await DailyReportModel.findOne({ date: todayDateStr });

    const orderRevenue = totalAmount || 0;
    const orderNetProfit = orderRevenue - calculatedTotalCogs;

    if (!dailyReport) {
      try {
        dailyReport = await DailyReportModel.create({
          date: todayDateStr,
          totalRevenue: orderRevenue,
          totalCogs: calculatedTotalCogs,
          netProfit: orderNetProfit,
          totalOrders: 1,
          itemsSold: [],
        });
      } catch {
        dailyReport = await DailyReportModel.findOne({ date: todayDateStr });
      }
    } else {
      dailyReport.totalRevenue += orderRevenue;
      dailyReport.totalCogs += calculatedTotalCogs;
      dailyReport.netProfit += orderNetProfit;
      dailyReport.totalOrders += 1;
    }

    if (dailyReport) {
      // Update itemsSold breakdown in daily report
      for (const item of items) {
        const menuItemId = item.menuItemId || item.id;
        const name = item.name || item.menuItemName;
        const category = item.category || 'General';
        const qty = item.quantity || 1;
        const price = item.unitPrice || item.unitPriceAtSale || (orderRevenue / (items.length || 1));

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
    }

    // 5. Automated Accounting Integration: Post Double-Entry Revenue & COGS Journals
    let accountingNotice: string | undefined;
    try {
      await AccountingIntegrationService.postPOSOrderJournals({
        orderId: Number(orderId),
        totalAmount: orderRevenue,
        cogsAmount: calculatedTotalCogs,
        paymentMethod: paymentMethod || 'Cash',
        isRoomCharge: paymentMethod === 'Room Charge',
        roomNumber: roomNumber || (targetOrder as any).roomNumber,
        guestName: guestName || (targetOrder as any).guestName,
        postedBy: auth.userDoc?.name || auth.session?.username || 'Cashier',
      });
    } catch (acctErr: any) {
      console.warn('POS Accounting Journal notice:', acctErr.message);
      accountingNotice = acctErr.message;
    }

    return NextResponse.json({
      success: true,
      message: `Order #${orderId} paid successfully. Database stock deducted & Daily Report updated.`,
      dailyReport: dailyReport ? {
        date: dailyReport.date,
        totalRevenue: dailyReport.totalRevenue,
        totalCogs: dailyReport.totalCogs,
        netProfit: dailyReport.netProfit,
        totalOrders: dailyReport.totalOrders,
      } : null,
    });
  } catch (error: any) {
    console.error('Order payment & inventory deduction error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Payment processing failed' }, { status: 500 });
  }
}
