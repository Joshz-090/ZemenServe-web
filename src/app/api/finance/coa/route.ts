import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { ChartOfAccountsService } from '@/lib/accounting/coa.service';
import { AccountType } from '@/lib/models/Account';

export const dynamic = 'force-dynamic';

// GET: List all accounts (seeds defaults if empty)
export async function GET(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant']);
    if (auth.errorResponse) return auth.errorResponse;

    // Ensure defaults exist
    await ChartOfAccountsService.initializeDefaultAccounts();

    const url = new URL(req.url);
    const type = url.searchParams.get('type') as AccountType | undefined;
    const searchTerm = url.searchParams.get('search') || undefined;

    const accounts = await ChartOfAccountsService.getAllAccounts({
      type,
      searchTerm,
    });

    return NextResponse.json({ success: true, count: accounts.length, accounts });
  } catch (error: any) {
    console.error('COA GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve Chart of Accounts' },
      { status: 500 }
    );
  }
}

// POST: Create a new account in the Chart of Accounts
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const { code, name, type, subType, normalBalance, parentCode, isReconcilable, ethiopianTaxMapping, description } =
      body;

    if (!code || !name || !type || !subType) {
      return NextResponse.json(
        { success: false, error: 'Code, Name, Type, and SubType are required fields.' },
        { status: 400 }
      );
    }

    const newAccount = await ChartOfAccountsService.createAccount({
      code,
      name,
      type,
      subType,
      normalBalance,
      parentCode,
      isReconcilable,
      ethiopianTaxMapping,
      description,
    });

    return NextResponse.json({ success: true, account: newAccount }, { status: 201 });
  } catch (error: any) {
    console.error('COA POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create account' },
      { status: 400 }
    );
  }
}
