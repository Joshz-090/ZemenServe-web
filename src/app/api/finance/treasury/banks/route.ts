import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { BankAccountModel } from '@/lib/models/BankAccount';
import { TreasuryService } from '@/lib/accounting/treasury.service';

export const dynamic = 'force-dynamic';

// GET: List all bank accounts and mobile money wallets
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
    let banks = await BankAccountModel.find().sort({ isPrimary: -1, accountType: 1 }).lean();

    if (banks.length === 0) {
      const seeded = await TreasuryService.seedDefaultDrawersAndBanks();
      banks = seeded.banks as any;
    }

    return NextResponse.json({
      success: true,
      banks,
    });
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch bank accounts' },
      { status: 500 }
    );
  }
}

// POST: Register a new bank account or mobile wallet
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    if (!body.bankId || !body.accountName || !body.accountNumber || !body.glAccountCode) {
      return NextResponse.json(
        { success: false, message: 'bankId, accountName, accountNumber, and glAccountCode are required.' },
        { status: 400 }
      );
    }

    const existing = await BankAccountModel.findOne({ bankId: body.bankId.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Bank account with ID "${body.bankId}" already exists.` },
        { status: 400 }
      );
    }

    const bank = await BankAccountModel.create({
      bankId: body.bankId.trim(),
      accountName: body.accountName.trim(),
      accountType: body.accountType || 'Bank',
      bankName: body.bankName || 'Commercial Bank of Ethiopia',
      accountNumber: body.accountNumber.trim(),
      branch: body.branch || 'Addis Ababa',
      glAccountCode: body.glAccountCode.trim(),
      currency: body.currency || 'ETB',
      currentBalance: Number(body.currentBalance) || 0,
      status: 'Active',
      isPrimary: !!body.isPrimary,
      notes: body.notes || '',
    });

    return NextResponse.json(
      { success: true, message: 'Bank account registered successfully', bank },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create bank account' },
      { status: 500 }
    );
  }
}
