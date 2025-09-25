import { eq, desc, and, or, gte, lte, sum } from 'drizzle-orm';
import { db } from './db';
import { users, tags, paymentMethods, expenses, accounts, ledger, transfers, settingsFinance } from '@shared/schema';
import { 
  type User, 
  type InsertUser, 
  type UpdateUser,
  type Expense, 
  type InsertExpense, 
  type UpdateExpense,
  type Tag,
  type InsertTag,
  type UpdateTag,
  type PaymentMethod,
  type InsertPaymentMethod,
  type UpdatePaymentMethod,
  type Account,
  type InsertAccount,
  type UpdateAccount,
  type Ledger,
  type InsertLedger,
  type Transfer,
  type InsertTransfer,
  type SettingsFinance,
  type InsertSettingsFinance,
  type UpdateSettingsFinance
} from "@shared/schema";
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with default admin user if not exists
    this.initializeDefaultAdmin();
  }

  private async initializeDefaultAdmin() {
    try {
      const existingAdmin = await db.query.users.findFirst({
        where: eq(users.username, 'Admin')
      });
      
      if (!existingAdmin) {
        await db.insert(users).values({
          username: 'Admin',
          password: 'Admin',
          dashboardAccess: true,
          expenseEntryAccess: true,
          adminPanelAccess: true,
        });
      }
    } catch (error) {
      console.error('Failed to initialize default admin:', error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    return result;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(user).returning();
    return result;
  }

  async updateUser(id: string, user: UpdateUser): Promise<User | undefined> {
    const [result] = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.query.users.findMany({
      orderBy: [users.username]
    });
  }

  // Tag methods
  async getTag(id: string): Promise<Tag | undefined> {
    const result = await db.query.tags.findFirst({
      where: eq(tags.id, id)
    });
    return result;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [result] = await db.insert(tags).values(tag).returning();
    return result;
  }

  async updateTag(id: string, tag: UpdateTag): Promise<Tag | undefined> {
    const [result] = await db.update(tags)
      .set({ ...tag, updatedAt: new Date() })
      .where(eq(tags.id, id))
      .returning();
    return result;
  }

  async deleteTag(id: string): Promise<boolean> {
    const result = await db.delete(tags).where(eq(tags.id, id));
    return result.rowCount > 0;
  }

  async getAllTags(): Promise<Tag[]> {
    return await db.query.tags.findMany({
      orderBy: [tags.name]
    });
  }

  // Payment Method methods
  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const result = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, id)
    });
    return result;
  }

  async createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const [result] = await db.insert(paymentMethods).values(paymentMethod).returning();
    return result;
  }

  async updatePaymentMethod(id: string, paymentMethod: UpdatePaymentMethod): Promise<PaymentMethod | undefined> {
    const [result] = await db.update(paymentMethods)
      .set({ ...paymentMethod, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    return result;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    const result = await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    return result.rowCount > 0;
  }

  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return await db.query.paymentMethods.findMany({
      orderBy: [paymentMethods.name]
    });
  }

  // Expense methods
  async getExpense(id: string): Promise<Expense | undefined> {
    const result = await db.query.expenses.findFirst({
      where: eq(expenses.id, id)
    });
    return result;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [result] = await db.insert(expenses).values(expense).returning();
    return result;
  }

  async createBulkExpenses(insertExpenses: InsertExpense[]): Promise<Expense[]> {
    if (insertExpenses.length === 0) return [];
    
    const results = await db.insert(expenses).values(insertExpenses).returning();
    return results;
  }

  async updateExpense(id: string, expense: UpdateExpense): Promise<Expense | undefined> {
    const [result] = await db.update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return result;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount > 0;
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.query.expenses.findMany({
      orderBy: [desc(expenses.date)]
    });
  }

  async getFilteredExpenses(filters: {
    dateRange?: string;
    tag?: string;
    paymentMethod?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Expense[]> {
    const conditions = [];

    // Filter by type
    if (filters.type) {
      conditions.push(eq(expenses.type, filters.type));
    }

    // Filter by tag
    if (filters.tag) {
      conditions.push(eq(expenses.tag, filters.tag));
    }

    // Filter by payment method
    if (filters.paymentMethod) {
      conditions.push(eq(expenses.paymentMethod, filters.paymentMethod));
    }

    // Filter by date range
    if (filters.dateRange) {
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;
        case 'this-month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last-month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'custom':
          if (filters.startDate && filters.endDate) {
            startDate = new Date(filters.startDate);
            endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
          } else {
            return await this.getAllExpenses();
          }
          break;
        default:
          if (filters.startDate && filters.endDate) {
            startDate = new Date(filters.startDate);
            endDate = new Date(filters.endDate);
          } else {
            return await this.getAllExpenses();
          }
      }

      // Add date range conditions
      conditions.push(gte(expenses.date, startDate.toISOString().split('T')[0]));
      conditions.push(lte(expenses.date, endDate.toISOString().split('T')[0]));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    return await db.query.expenses.findMany({
      where: whereClause,
      orderBy: [desc(expenses.date)]
    });
  }

  // Account methods
  async getAccount(id: string): Promise<Account | undefined> {
    const result = await db.query.accounts.findFirst({
      where: eq(accounts.id, id)
    });
    return result;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [result] = await db.insert(accounts).values({
      ...account,
      currentBalance: account.openingBalance || '0'
    }).returning();
    
    // Create opening balance ledger entry if opening balance is not zero
    if (account.openingBalance && parseFloat(account.openingBalance) !== 0) {
      await db.insert(ledger).values({
        accountId: result.id,
        txType: 'opening_balance',
        amount: account.openingBalance,
        currency: account.currency || 'BDT',
        fxRate: '1',
        amountBase: account.openingBalance,
        refType: 'opening_balance',
        refId: result.id,
        note: 'Opening balance',
        createdBy: account.createdBy || null
      });
      
      // Ensure current balance is updated after opening balance entry
      await this.recomputeAccountBalance(result.id);
    }
    
    return result;
  }

  async updateAccount(id: string, account: UpdateAccount): Promise<Account | undefined> {
    const [result] = await db.update(accounts)
      .set({ ...account, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return result;
  }

  async deleteAccount(id: string): Promise<boolean> {
    const result = await db.delete(accounts).where(eq(accounts.id, id));
    return result.rowCount > 0;
  }

  async getAllAccounts(): Promise<Account[]> {
    return await db.query.accounts.findMany({
      orderBy: [accounts.name]
    });
  }

  async getActiveAccounts(): Promise<Account[]> {
    return await db.query.accounts.findMany({
      where: eq(accounts.status, 'active'),
      orderBy: [accounts.name]
    });
  }

  async updateAccountBalance(id: string, balance: string): Promise<Account | undefined> {
    const [result] = await db.update(accounts)
      .set({ 
        currentBalance: balance, 
        updatedAt: new Date() 
      })
      .where(eq(accounts.id, id))
      .returning();
    return result;
  }

  // Ledger methods
  async getLedger(id: string): Promise<Ledger | undefined> {
    const result = await db.query.ledger.findFirst({
      where: eq(ledger.id, id)
    });
    return result;
  }

  async createLedger(ledgerEntry: InsertLedger): Promise<Ledger> {
    const [result] = await db.insert(ledger).values(ledgerEntry).returning();
    
    // Update account balance
    await this.recomputeAccountBalance(ledgerEntry.accountId);
    
    return result;
  }

  async getLedgerByAccount(accountId: string): Promise<Ledger[]> {
    return await db.query.ledger.findMany({
      where: eq(ledger.accountId, accountId),
      orderBy: [desc(ledger.createdAt)]
    });
  }

  async getAllLedger(): Promise<Ledger[]> {
    return await db.query.ledger.findMany({
      orderBy: [desc(ledger.createdAt)]
    });
  }

  async deleteLedgerByRef(refType: string, refId: string): Promise<boolean> {
    // First, get the ledger entries that will be deleted to know which accounts need balance recomputation
    const ledgerEntriesToDelete = await db.query.ledger.findMany({
      where: and(
        eq(ledger.refType, refType),
        eq(ledger.refId, refId)
      )
    });
    
    // Get unique account IDs that will be affected
    const uniqueAccountIds = new Set<string>();
    ledgerEntriesToDelete.forEach(entry => uniqueAccountIds.add(entry.accountId));
    const affectedAccountIds = Array.from(uniqueAccountIds);
    
    // Delete the ledger entries
    const result = await db.delete(ledger)
      .where(and(
        eq(ledger.refType, refType),
        eq(ledger.refId, refId)
      ));
    
    // Recompute balances for all affected accounts
    for (const accountId of affectedAccountIds) {
      await this.recomputeAccountBalance(accountId);
    }
    
    return result.rowCount > 0;
  }

  // Helper method to recompute account balance
  private async recomputeAccountBalance(accountId: string): Promise<void> {
    const account = await this.getAccount(accountId);
    if (!account) return;

    const ledgerEntries = await this.getLedgerByAccount(accountId);
    const totalAmount = ledgerEntries.reduce((sum, entry) => 
      sum + parseFloat(entry.amount), 0);

    await this.updateAccountBalance(accountId, totalAmount.toString());
  }

  // Transfer methods
  async getTransfer(id: string): Promise<Transfer | undefined> {
    const result = await db.query.transfers.findFirst({
      where: eq(transfers.id, id)
    });
    return result;
  }

  async createTransfer(transfer: InsertTransfer): Promise<Transfer> {
    const [result] = await db.insert(transfers).values(transfer).returning();
    
    // Create ledger entries for both accounts
    const transferAmount = parseFloat(transfer.amount);
    const fxRate = parseFloat(transfer.fxRate || '1');
    const fee = parseFloat(transfer.fee || '0');
    
    // From account: debit
    await this.createLedger({
      accountId: transfer.fromAccountId,
      txType: 'transfer_out',
      amount: (-transferAmount).toString(),
      currency: transfer.currency,
      fxRate: transfer.fxRate || '1',
      amountBase: (-transferAmount).toString(),
      refType: 'transfer',
      refId: result.id,
      note: transfer.note || `Transfer to account`,
      createdBy: transfer.createdBy
    });

    // To account: credit
    await this.createLedger({
      accountId: transfer.toAccountId,
      txType: 'transfer_in',
      amount: (transferAmount * fxRate).toString(),
      currency: transfer.currency,
      fxRate: transfer.fxRate || '1',
      amountBase: (transferAmount * fxRate).toString(),
      refType: 'transfer',
      refId: result.id,
      note: transfer.note || `Transfer from account`,
      createdBy: transfer.createdBy
    });

    // If there's a fee, deduct from from_account
    if (fee > 0) {
      await this.createLedger({
        accountId: transfer.fromAccountId,
        txType: 'expense',
        amount: (-fee).toString(),
        currency: transfer.currency,
        fxRate: transfer.fxRate || '1',
        amountBase: (-fee).toString(),
        refType: 'transfer_fee',
        refId: result.id,
        note: 'Transfer fee',
        createdBy: transfer.createdBy
      });
    }
    
    return result;
  }

  async getAllTransfers(): Promise<Transfer[]> {
    return await db.query.transfers.findMany({
      orderBy: [desc(transfers.createdAt)]
    });
  }

  async getTransfersByAccount(accountId: string): Promise<Transfer[]> {
    return await db.query.transfers.findMany({
      where: or(
        eq(transfers.fromAccountId, accountId),
        eq(transfers.toAccountId, accountId)
      ),
      orderBy: [desc(transfers.createdAt)]
    });
  }

  // Settings methods
  async getFinanceSettings(): Promise<SettingsFinance | undefined> {
    const result = await db.query.settingsFinance.findFirst();
    
    // Create default settings if none exist
    if (!result) {
      const [newSettings] = await db.insert(settingsFinance).values({
        baseCurrency: 'BDT',
        allowNegativeBalances: true
      }).returning();
      return newSettings;
    }
    
    return result;
  }

  // Check if settings exist without creating defaults
  private async financeSettingsExist(): Promise<SettingsFinance | undefined> {
    return await db.query.settingsFinance.findFirst();
  }

  async createFinanceSettings(settings: InsertSettingsFinance): Promise<SettingsFinance> {
    // Check if settings already exist without creating defaults
    const existingSettings = await this.financeSettingsExist();
    
    if (existingSettings) {
      throw new Error("Finance settings already exist. Use update instead.");
    }
    
    // Create new settings with provided data and defaults
    const [result] = await db.insert(settingsFinance).values({
      baseCurrency: settings.baseCurrency || 'BDT',
      allowNegativeBalances: settings.allowNegativeBalances ?? true
    }).returning();
    return result;
  }

  async updateFinanceSettings(settings: UpdateSettingsFinance): Promise<SettingsFinance> {
    const existingSettings = await this.getFinanceSettings();
    
    if (!existingSettings) {
      throw new Error("No finance settings found. Create settings first.");
    }
    
    const [result] = await db.update(settingsFinance)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(settingsFinance.id, existingSettings.id))
      .returning();
    return result;
  }
}