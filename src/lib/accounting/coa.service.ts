import { connectToDatabase } from '@/lib/db';
import { AccountModel, IAccount, AccountType, NormalBalance } from '@/lib/models/Account';
import { STANDARD_ETHIOPIAN_HOTEL_ACCOUNTS } from './standardAccounts';

export class ChartOfAccountsService {
  /**
   * Initializes and seeds the default Ethiopian Hotel Chart of Accounts if empty.
   * Can be safely invoked multiple times (idempotent).
   */
  static async initializeDefaultAccounts(): Promise<{ seeded: number; existing: number }> {
    await connectToDatabase();
    const existingCount = await AccountModel.countDocuments();

    if (existingCount === 0) {
      const docs = STANDARD_ETHIOPIAN_HOTEL_ACCOUNTS.map((acc) => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        normalBalance: acc.normalBalance,
        parentCode: acc.parentCode || null,
        currency: 'ETB',
        isActive: true,
        isReconcilable: acc.isReconcilable,
        ethiopianTaxMapping: acc.ethiopianTaxMapping || null,
        description: acc.description,
      }));

      await AccountModel.insertMany(docs, { ordered: false });
      return { seeded: docs.length, existing: 0 };
    }

    return { seeded: 0, existing: existingCount };
  }

  /**
   * Fetches all accounts with optional filtering and grouping.
   */
  static async getAllAccounts(options?: {
    type?: AccountType;
    isActive?: boolean;
    searchTerm?: string;
  }): Promise<IAccount[]> {
    await connectToDatabase();
    const query: any = {};

    if (options?.type) {
      query.type = options.type;
    }
    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    if (options?.searchTerm) {
      const regex = new RegExp(options.searchTerm, 'i');
      query.$or = [{ code: regex }, { name: regex }, { subType: regex }];
    }

    return AccountModel.find(query).sort({ code: 1 }).lean();
  }

  /**
   * Finds an individual account by its code.
   */
  static async getAccountByCode(code: string): Promise<IAccount | null> {
    await connectToDatabase();
    return AccountModel.findOne({ code: code.trim() }).lean();
  }

  /**
   * Creates a new custom account with strict code uniqueness and balance checks.
   */
  static async createAccount(payload: {
    code: string;
    name: string;
    type: AccountType;
    subType: string;
    normalBalance?: NormalBalance;
    parentCode?: string | null;
    isReconcilable?: boolean;
    ethiopianTaxMapping?: string | null;
    description?: string;
  }): Promise<IAccount> {
    await connectToDatabase();

    const code = payload.code.trim();
    const existing = await AccountModel.findOne({ code });
    if (existing) {
      throw new Error(`Account code "${code}" already exists in the Chart of Accounts.`);
    }

    // Default normal balance based on accounting equation standard
    const defaultNormalBalance: NormalBalance =
      payload.type === 'Asset' || payload.type === 'Expense' ? 'Debit' : 'Credit';

    const account = await AccountModel.create({
      code,
      name: payload.name.trim(),
      type: payload.type,
      subType: payload.subType.trim(),
      normalBalance: payload.normalBalance || defaultNormalBalance,
      parentCode: payload.parentCode ? payload.parentCode.trim() : null,
      currency: 'ETB',
      isActive: true,
      isReconcilable: !!payload.isReconcilable,
      ethiopianTaxMapping: payload.ethiopianTaxMapping || null,
      description: payload.description || '',
    });

    return account;
  }

  /**
   * Updates an existing account's descriptive attributes.
   * Prohibits changing code or normal balance to preserve posted ledger integrity.
   */
  static async updateAccount(
    code: string,
    updates: {
      name?: string;
      subType?: string;
      isActive?: boolean;
      isReconcilable?: boolean;
      ethiopianTaxMapping?: string | null;
      description?: string;
    }
  ): Promise<IAccount | null> {
    await connectToDatabase();

    const account = await AccountModel.findOneAndUpdate(
      { code: code.trim() },
      { $set: updates },
      { new: true }
    );

    if (!account) {
      throw new Error(`Account code "${code}" not found.`);
    }

    return account;
  }
}
