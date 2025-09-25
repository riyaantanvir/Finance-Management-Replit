import { eq, desc, and, or, gte, lte, sum } from 'drizzle-orm';
import { db } from './db';
import { users, tags, paymentMethods, expenses, accounts, ledger, transfers, settingsFinance, exchangeRates } from '@shared/schema';
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
  type UpdateSettingsFinance,
  type ExchangeRate,
  type InsertExchangeRate,
  type UpdateExchangeRate
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
    
    // Integrate with Fund Management: Create ledger entries for linked accounts
    await this.integrateExpenseWithFundManagement(result);
    
    return result;
  }

  // Helper method to integrate expense with Fund Management
  private async integrateExpenseWithFundManagement(expense: Expense): Promise<void> {
    try {
      // Find accounts linked to this payment method
      const linkedAccounts = await this.getAccountsByPaymentMethod(expense.paymentMethod);
      
      if (linkedAccounts.length === 0) {
        // No accounts linked to this payment method, skip integration
        return;
      }

      // For multiple accounts with same payment method, use the first active one
      // In future, this could be enhanced to allow user selection
      const targetAccount = linkedAccounts[0];
      
      // Determine transaction type and amount
      const amount = parseFloat(expense.amount);
      const isIncome = expense.type === 'income';
      const ledgerAmount = isIncome ? amount : -amount; // Income = positive, Expense = negative
      const txType = isIncome ? 'income' : 'expense';
      
      // Create ledger entry
      await this.createLedger({
        accountId: targetAccount.id,
        txType: txType as any,
        amount: ledgerAmount.toString(),
        currency: targetAccount.currency,
        fxRate: '1',
        amountBase: ledgerAmount.toString(),
        refType: 'expense',
        refId: expense.id,
        note: `${expense.type}: ${expense.details}`,
        createdBy: null // Could be enhanced to track user
      });
      
    } catch (error) {
      // Log error but don't fail the expense creation
      console.error('Failed to integrate expense with Fund Management:', error);
    }
  }

  async createBulkExpenses(insertExpenses: InsertExpense[]): Promise<Expense[]> {
    if (insertExpenses.length === 0) return [];
    
    const results = await db.insert(expenses).values(insertExpenses).returning();
    
    // Integrate each expense with Fund Management
    for (const expense of results) {
      await this.integrateExpenseWithFundManagement(expense);
    }
    
    return results;
  }

  async updateExpense(id: string, expense: UpdateExpense): Promise<Expense | undefined> {
    // Delete old ledger entries for this expense
    await this.deleteLedgerByRef('expense', id);
    
    const [result] = await db.update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    
    // Re-integrate with Fund Management using updated data
    if (result) {
      await this.integrateExpenseWithFundManagement(result);
    }
    
    return result;
  }

  async deleteExpense(id: string): Promise<boolean> {
    // Delete associated ledger entries first
    await this.deleteLedgerByRef('expense', id);
    
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

  async getAccountsByPaymentMethod(paymentMethodName: string): Promise<Account[]> {
    return await db.query.accounts.findMany({
      where: and(
        eq(accounts.paymentMethodKey, paymentMethodName),
        eq(accounts.status, 'active')
      ),
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

  // Exchange Rate methods
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | undefined> {
    const result = await db.query.exchangeRates.findFirst({
      where: and(
        eq(exchangeRates.fromCurrency, fromCurrency),
        eq(exchangeRates.toCurrency, toCurrency)
      )
    });
    return result;
  }

  async createExchangeRate(exchangeRate: InsertExchangeRate): Promise<ExchangeRate> {
    const [result] = await db.insert(exchangeRates).values(exchangeRate).returning();
    return result;
  }

  async updateExchangeRate(id: string, exchangeRate: UpdateExchangeRate): Promise<ExchangeRate | undefined> {
    const [result] = await db.update(exchangeRates)
      .set({ ...exchangeRate, updatedAt: new Date() })
      .where(eq(exchangeRates.id, id))
      .returning();
    return result;
  }

  async deleteExchangeRate(id: string): Promise<boolean> {
    const result = await db.delete(exchangeRates).where(eq(exchangeRates.id, id));
    return result.rowCount > 0;
  }

  async getAllExchangeRates(): Promise<ExchangeRate[]> {
    return await db.query.exchangeRates.findMany({
      orderBy: [exchangeRates.fromCurrency, exchangeRates.toCurrency]
    });
  }

  async upsertExchangeRate(fromCurrency: string, toCurrency: string, rate: string): Promise<ExchangeRate> {
    // Try to find existing exchange rate
    const existingRate = await this.getExchangeRate(fromCurrency, toCurrency);
    
    if (existingRate) {
      // Update existing
      const updated = await this.updateExchangeRate(existingRate.id, { rate });
      return updated!;
    } else {
      // Create new
      return await this.createExchangeRate({
        fromCurrency,
        toCurrency,
        rate
      });
    }
  }
}