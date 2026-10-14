import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { CashDrawerModel } from '@/lib/models/CashDrawer';
import { TreasuryService } from '@/lib/accounting/treasury.service';

export const dynamic = 'force-dynamic';

// GET: List all cash registers and drawers (auto-seeds defaults if empty)
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, [
      'Admin',
      'Manager',
      'Accountant',
      'Cashier',
      'Receptionist',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    let drawers = await CashDrawerModel.find().sort({ station: 1, drawerId: 1 }).lean();

    if (drawers.length === 0) {
      const seeded = await TreasuryService.seedDefaultDrawersAndBanks();
      drawers = seeded.drawers as any;
    }

    return NextResponse.json({
      success: true,
      drawers,
    });
  } catch (error: any) {
    console.error('Error fetching cash drawers:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch cash drawers' },
      { status: 500 }
    );
  }
}

// POST: Register a new cash register drawer
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    if (!body.drawerId || !body.name || !body.station || !body.glAccountCode) {
      return NextResponse.json(
        { success: false, message: 'drawerId, name, station, and glAccountCode are required.' },
        { status: 400 }
      );
    }

    const existing = await CashDrawerModel.findOne({ drawerId: body.drawerId.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Drawer with ID "${body.drawerId}" already exists.` },
        { status: 400 }
      );
    }

    const drawer = await CashDrawerModel.create({
      drawerId: body.drawerId.trim(),
      name: body.name.trim(),
      station: body.station,
      glAccountCode: body.glAccountCode.trim(),
      currentBalance: Number(body.currentBalance) || 0,
      currency: body.currency || 'ETB',
      status: 'Active',
      location: body.location || '',
      notes: body.notes || '',
    });

    return NextResponse.json(
      { success: true, message: 'Cash drawer registered successfully', drawer },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating cash drawer:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create cash drawer' },
      { status: 500 }
    );
  }
}
