import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { OrderModel } from '@/lib/models/Order';

// GET: Fetch all orders from database
export async function GET() {
  try {
    await connectToDatabase();
    const docs = await OrderModel.find().sort({ idNumber: -1 }).limit(200).lean();

    const orders = docs.map((doc: any) => ({
      id: doc.idNumber,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      status: doc.status,
      totalAmount: doc.totalAmount,
      cashierNote: doc.cashierNote,
      waiterId: doc.waiterId,
      waiterName: doc.waiterName,
      isPaid: doc.isPaid,
      paymentMethod: doc.paymentMethod,
      cancelReason: doc.cancelReason,
      orderItems: (doc.orderItems || []).map((item: any) => ({
        id: item.idNumber,
        orderId: item.orderIdNumber,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPriceAtSale: item.unitPriceAtSale,
      })),
    }));

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Database Orders GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders from database' },
      { status: 500 }
    );
  }
}

// POST: Create a new order in database
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { cartItems, cashierNote, waiterId, waiterName, tableNumber, totalAmount } = body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart items are required to create an order' },
        { status: 400 }
      );
    }

    // Determine next order ID atomically
    const lastOrder = await OrderModel.findOne().sort({ idNumber: -1 }).lean();
    const nextOrderId = lastOrder && lastOrder.idNumber ? lastOrder.idNumber + 1 : 1;

    const orderItems = cartItems.map((item: any, idx: number) => ({
      idNumber: idx + 1,
      orderIdNumber: nextOrderId,
      menuItemId: item.menuItemId,
      menuItemName: item.menuItemName || 'Item',
      quantity: item.quantity,
      unitPriceAtSale: item.unitPriceAtSale || item.price || 0,
    }));

    const newOrder = await OrderModel.create({
      idNumber: nextOrderId,
      status: 'Pending',
      totalAmount: totalAmount || 0,
      cashierNote: cashierNote || (tableNumber ? `Table ${tableNumber}` : 'Dine-In'),
      waiterId: waiterId || undefined,
      waiterName: waiterName || 'Staff',
      isPaid: false,
      orderItems,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: newOrder.idNumber,
        createdAt: newOrder.createdAt.toISOString(),
        status: newOrder.status,
        totalAmount: newOrder.totalAmount,
        cashierNote: newOrder.cashierNote,
        waiterId: newOrder.waiterId,
        waiterName: newOrder.waiterName,
        isPaid: newOrder.isPaid,
        orderItems: newOrder.orderItems.map((item: any) => ({
          id: item.idNumber,
          orderId: item.orderIdNumber,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          unitPriceAtSale: item.unitPriceAtSale,
        })),
      },
    });
  } catch (error: any) {
    console.error('Database Orders POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order in database' },
      { status: 500 }
    );
  }
}

// PUT: Update order status (Pending -> Preparing -> Ready -> Served -> Cancelled) or order items
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { orderId, status, isPaid, paymentMethod, cancelReason, orderItems, totalAmount } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const order = await OrderModel.findOne({ idNumber: Number(orderId) });
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found in database' },
        { status: 404 }
      );
    }

    if (status) order.status = status;
    if (isPaid !== undefined) order.isPaid = Boolean(isPaid);
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (cancelReason) order.cancelReason = cancelReason;
    if (totalAmount !== undefined) order.totalAmount = totalAmount;

    if (Array.isArray(orderItems)) {
      order.orderItems = orderItems.map((item: any, idx: number) => ({
        idNumber: item.id || idx + 1,
        orderIdNumber: Number(orderId),
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPriceAtSale: item.unitPriceAtSale || item.unitPrice || 0,
      }));
    }

    await order.save();

    return NextResponse.json({
      success: true,
      order: {
        id: order.idNumber,
        createdAt: order.createdAt.toISOString(),
        status: order.status,
        totalAmount: order.totalAmount,
        cashierNote: order.cashierNote,
        waiterId: order.waiterId,
        waiterName: order.waiterName,
        isPaid: order.isPaid,
        paymentMethod: order.paymentMethod,
        cancelReason: order.cancelReason,
        orderItems: order.orderItems.map((item: any) => ({
          id: item.idNumber,
          orderId: item.orderIdNumber,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          unitPriceAtSale: item.unitPriceAtSale,
        })),
      },
    });
  } catch (error: any) {
    console.error('Database Orders PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order in database' },
      { status: 500 }
    );
  }
}
