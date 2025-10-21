import { eq, desc, and, or, gte, lte, sum, sql } from 'drizzle-orm';
import { db } from './db';
import { users, tags, paymentMethods, expenses, plannedPayments, accounts, ledger, transfers, settingsFinance, exchangeRates, invProjects, invCategories, invTx, invPayouts, subscriptions, telegramSettings, workReports, cryptoApiSettings, cryptoWatchlist, cryptoAlerts, cryptoPortfolio } from '@shared/schema';
import { 
  type User, 
  type InsertUser, 
  type UpdateUser,
  type Expense, 
  type InsertExpense, 
  type UpdateExpense,
  type PlannedPayment,
  type InsertPlannedPayment,
  type UpdatePlannedPayment,
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
  type UpdateExchangeRate,
  type InvProject,
  type InsertInvProject,
  type UpdateInvProject,
  type InvCategory,
  type InsertInvCategory,
  type InvTx,
  type InsertInvTx,
  type UpdateInvTx,
  type InvPayout,
  type InsertInvPayout,
  type Subscription,
  type InsertSubscription,
  type UpdateSubscription,
  type TelegramSettings,
  type InsertTelegramSettings,
  type UpdateTelegramSettings,
  type WorkReport,
  type InsertWorkReport,
  type UpdateWorkReport,
  type CryptoApiSettings,
  type InsertCryptoApiSettings,
  type UpdateCryptoApiSettings,
  type CryptoWatchlist,
  type InsertCryptoWatchlist,
  type CryptoAlert,
  type InsertCryptoAlert,
  type UpdateCryptoAlert,
  type CryptoPortfolio,
  type InsertCryptoPortfolio,
  type UpdateCryptoPortfolio
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

  // Planned Payment methods
  async getPlannedPayment(id: string): Promise<PlannedPayment | undefined> {
    const result = await db.query.plannedPayments.findFirst({
      where: eq(plannedPayments.id, id)
    });
    return result;
  }

  async createPlannedPayment(payment: InsertPlannedPayment): Promise<PlannedPayment> {
    const [result] = await db.insert(plannedPayments).values(payment).returning();
    return result;
  }

  async updatePlannedPayment(id: string, payment: UpdatePlannedPayment): Promise<PlannedPayment | undefined> {
    const [result] = await db.update(plannedPayments)
      .set({ ...payment, updatedAt: new Date() })
      .where(eq(plannedPayments.id, id))
      .returning();
    return result;
  }

  async deletePlannedPayment(id: string): Promise<boolean> {
    const result = await db.delete(plannedPayments).where(eq(plannedPayments.id, id));
    return result.rowCount > 0;
  }

  async getAllPlannedPayments(): Promise<PlannedPayment[]> {
    return await db.query.plannedPayments.findMany({
      orderBy: [desc(plannedPayments.createdAt)]
    });
  }

  async getActivePlannedPayments(): Promise<PlannedPayment[]> {
    return await db.query.plannedPayments.findMany({
      where: eq(plannedPayments.isActive, true),
      orderBy: [desc(plannedPayments.createdAt)]
    });
  }

  async getPlannedPaymentsByTag(tag: string): Promise<PlannedPayment[]> {
    return await db.query.plannedPayments.findMany({
      where: and(
        eq(plannedPayments.tag, tag),
        eq(plannedPayments.isActive, true)
      ),
      orderBy: [desc(plannedPayments.createdAt)]
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

  async hasLedgerEntries(accountId: string): Promise<boolean> {
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(ledger)
      .where(eq(ledger.accountId, accountId));
    return count[0]?.count > 0;
  }

  async hasAccountTransfers(accountId: string): Promise<boolean> {
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(transfers)
      .where(or(
        eq(transfers.fromAccountId, accountId),
        eq(transfers.toAccountId, accountId)
      ));
    return count[0]?.count > 0;
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

  // Investment Project methods
  async getInvProject(id: string): Promise<InvProject | undefined> {
    const result = await db.query.invProjects.findFirst({
      where: eq(invProjects.id, id)
    });
    return result;
  }

  async createInvProject(project: InsertInvProject): Promise<InvProject> {
    const [result] = await db.insert(invProjects).values(project).returning();
    return result;
  }

  async updateInvProject(id: string, project: UpdateInvProject): Promise<InvProject | undefined> {
    const [result] = await db.update(invProjects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(invProjects.id, id))
      .returning();
    return result;
  }

  async deleteInvProject(id: string): Promise<boolean> {
    const result = await db.delete(invProjects).where(eq(invProjects.id, id));
    return result.rowCount > 0;
  }

  async getAllInvProjects(): Promise<InvProject[]> {
    return await db.query.invProjects.findMany({
      orderBy: [desc(invProjects.createdAt)]
    });
  }

  async getActiveInvProjects(): Promise<InvProject[]> {
    return await db.query.invProjects.findMany({
      where: eq(invProjects.status, 'active'),
      orderBy: [desc(invProjects.createdAt)]
    });
  }

  // Investment Category methods
  async getInvCategory(id: string): Promise<InvCategory | undefined> {
    const result = await db.query.invCategories.findFirst({
      where: eq(invCategories.id, id)
    });
    return result;
  }

  async createInvCategory(category: InsertInvCategory): Promise<InvCategory> {
    const [result] = await db.insert(invCategories).values(category).returning();
    return result;
  }

  async deleteInvCategory(id: string): Promise<boolean> {
    const result = await db.delete(invCategories).where(eq(invCategories.id, id));
    return result.rowCount > 0;
  }

  async getInvCategoriesByProject(projectId: string): Promise<InvCategory[]> {
    return await db.query.invCategories.findMany({
      where: eq(invCategories.projectId, projectId),
      orderBy: [invCategories.name]
    });
  }

  async getAllInvCategories(): Promise<InvCategory[]> {
    return await db.query.invCategories.findMany({
      orderBy: [invCategories.name]
    });
  }

  // Investment Transaction methods
  async getInvTx(id: string): Promise<InvTx | undefined> {
    const result = await db.query.invTx.findFirst({
      where: eq(invTx.id, id)
    });
    return result;
  }

  async createInvTx(tx: InsertInvTx): Promise<InvTx> {
    const [result] = await db.insert(invTx).values(tx).returning();
    
    // Get the project for reference
    const project = await this.getInvProject(tx.projectId);
    const projectName = project?.name || 'Unknown Project';
    
    if (tx.direction === 'cost') {
      // Investment Cost: Double-entry accounting
      // 1. Credit the cash/bank account (money leaves)
      await this.createLedger({
        accountId: tx.accountId,
        txType: 'withdrawal',
        amount: `-${tx.amount}`,
        currency: tx.currency,
        fxRate: (tx.fxRate || '1').toString(),
        amountBase: `-${tx.amountBase}`,
        refType: 'investment_tx',
        refId: result.id,
        note: tx.note || `Investment cost: ${projectName}`,
        createdBy: tx.createdBy
      });
      
      // 2. Find or create an Investment Asset account for this project
      const investmentAccount = await this.findOrCreateInvestmentAccount(tx.projectId, projectName, tx.currency);
      
      // 3. Debit the investment asset account (investment value increases)  
      await this.createLedger({
        accountId: investmentAccount.id,
        txType: 'deposit',
        amount: tx.amount.toString(),
        currency: tx.currency,
        fxRate: (tx.fxRate || '1').toString(),
        amountBase: tx.amountBase.toString(),
        refType: 'investment_tx',
        refId: result.id,
        note: tx.note || `Investment in ${projectName}`,
        createdBy: tx.createdBy
      });
      
    } else {
      // Investment Income: Double-entry accounting
      // 1. Debit the cash/bank account (money comes in)
      await this.createLedger({
        accountId: tx.accountId,
        txType: 'deposit',
        amount: tx.amount.toString(),
        currency: tx.currency,
        fxRate: (tx.fxRate || '1').toString(),
        amountBase: tx.amountBase.toString(),
        refType: 'investment_tx',
        refId: result.id,
        note: tx.note || `Income from ${projectName}`,
        createdBy: tx.createdBy
      });
      
      // 2. Find or create an Investment Revenue account for this project
      const revenueAccount = await this.findOrCreateInvestmentRevenueAccount(tx.projectId, projectName, tx.currency);
      
      // 3. Credit the investment revenue account (revenue increases)
      await this.createLedger({
        accountId: revenueAccount.id,
        txType: 'withdrawal',
        amount: `-${tx.amount}`,
        currency: tx.currency,
        fxRate: (tx.fxRate || '1').toString(),
        amountBase: `-${tx.amountBase}`,
        refType: 'investment_tx',
        refId: result.id,
        note: tx.note || `Revenue from ${projectName}`,
        createdBy: tx.createdBy
      });
    }

    return result;
  }

  async updateInvTx(id: string, tx: UpdateInvTx): Promise<InvTx | undefined> {
    // First, delete existing ledger entries (both sides of double-entry)
    await this.deleteLedgerByRef('investment_tx', id);
    
    // Update the transaction
    const [result] = await db.update(invTx)
      .set(tx)
      .where(eq(invTx.id, id))
      .returning();

    if (result) {
      // Get the project for reference
      const project = await this.getInvProject(result.projectId);
      const projectName = project?.name || 'Unknown Project';
      
      if (result.direction === 'cost') {
        // Investment Cost: Double-entry accounting
        // 1. Credit the cash/bank account (money leaves)
        await this.createLedger({
          accountId: result.accountId,
          txType: 'withdrawal',
          amount: `-${result.amount}`,
          currency: result.currency,
          fxRate: (result.fxRate || '1').toString(),
          amountBase: `-${result.amountBase}`,
          refType: 'investment_tx',
          refId: result.id,
          note: result.note || `Investment cost: ${projectName}`,
          createdBy: result.createdBy
        });
        
        // 2. Find or create an Investment Asset account for this project
        const investmentAccount = await this.findOrCreateInvestmentAccount(result.projectId, projectName, result.currency);
        
        // 3. Debit the investment asset account (investment value increases)  
        await this.createLedger({
          accountId: investmentAccount.id,
          txType: 'deposit',
          amount: result.amount.toString(),
          currency: result.currency,
          fxRate: (result.fxRate || '1').toString(),
          amountBase: result.amountBase.toString(),
          refType: 'investment_tx',
          refId: result.id,
          note: result.note || `Investment in ${projectName}`,
          createdBy: result.createdBy
        });
        
      } else {
        // Investment Income: Double-entry accounting
        // 1. Debit the cash/bank account (money comes in)
        await this.createLedger({
          accountId: result.accountId,
          txType: 'deposit',
          amount: result.amount.toString(),
          currency: result.currency,
          fxRate: (result.fxRate || '1').toString(),
          amountBase: result.amountBase.toString(),
          refType: 'investment_tx',
          refId: result.id,
          note: result.note || `Income from ${projectName}`,
          createdBy: result.createdBy
        });
        
        // 2. Find or create an Investment Revenue account for this project
        const revenueAccount = await this.findOrCreateInvestmentRevenueAccount(result.projectId, projectName, result.currency);
        
        // 3. Credit the investment revenue account (revenue increases)
        await this.createLedger({
          accountId: revenueAccount.id,
          txType: 'withdrawal',
          amount: `-${result.amount}`,
          currency: result.currency,
          fxRate: (result.fxRate || '1').toString(),
          amountBase: `-${result.amountBase}`,
          refType: 'investment_tx',
          refId: result.id,
          note: result.note || `Revenue from ${projectName}`,
          createdBy: result.createdBy
        });
      }
    }

    return result;
  }

  async deleteInvTx(id: string): Promise<boolean> {
    // First get the transaction to know which account to update
    const transaction = await this.getInvTx(id);
    if (!transaction) return false;

    // Delete ledger entry
    await this.deleteLedgerByRef('investment_tx', id);
    
    // Delete the transaction
    const result = await db.delete(invTx).where(eq(invTx.id, id));
    
    if (result.rowCount > 0) {
      // Recompute account balance
      await this.recomputeAccountBalance(transaction.accountId);
    }

    return result.rowCount > 0;
  }

  async getAllInvTx(): Promise<InvTx[]> {
    return await db.query.invTx.findMany({
      orderBy: [desc(invTx.createdAt)]
    });
  }

  async getInvTxByProject(projectId: string): Promise<InvTx[]> {
    return await db.query.invTx.findMany({
      where: eq(invTx.projectId, projectId),
      orderBy: [desc(invTx.createdAt)]
    });
  }

  async getFilteredInvTx(filters: {
    projectId?: string;
    categoryId?: string;
    direction?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<InvTx[]> {
    const conditions = [];

    if (filters.projectId) {
      conditions.push(eq(invTx.projectId, filters.projectId));
    }
    if (filters.categoryId) {
      conditions.push(eq(invTx.categoryId, filters.categoryId));
    }
    if (filters.direction) {
      conditions.push(eq(invTx.direction, filters.direction as any));
    }
    if (filters.accountId) {
      conditions.push(eq(invTx.accountId, filters.accountId));
    }
    if (filters.startDate) {
      conditions.push(gte(invTx.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(invTx.date, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db.query.invTx.findMany({
      where: whereClause,
      orderBy: [desc(invTx.createdAt)]
    });
  }

  // Investment Payout methods
  async getInvPayout(id: string): Promise<InvPayout | undefined> {
    const result = await db.query.invPayouts.findFirst({
      where: eq(invPayouts.id, id)
    });
    return result;
  }

  async createInvPayout(payout: InsertInvPayout): Promise<InvPayout> {
    const [result] = await db.insert(invPayouts).values(payout).returning();
    
    // Get the project for reference
    const project = await this.getInvProject(payout.projectId);
    const projectName = project?.name || 'Unknown Project';
    
    // Investment Payout: Double-entry accounting
    // 1. Debit the cash/bank account (money received)
    await this.createLedger({
      accountId: payout.toAccountId,
      txType: 'deposit',
      amount: payout.amount.toString(),
      currency: payout.currency,
      fxRate: (payout.fxRate || '1').toString(),
      amountBase: (parseFloat(payout.amount.toString()) * parseFloat((payout.fxRate || '1').toString())).toString(),
      refType: 'investment_payout',
      refId: result.id,
      note: payout.note || `Payout from ${projectName}`,
      createdBy: payout.createdBy
    });

    // 2. Find or create an Investment Asset account for this project and credit it (decrease investment value)
    const investmentAccount = await this.findOrCreateInvestmentAccount(payout.projectId, projectName, payout.currency);
    
    // 3. Credit the investment asset account (investment value decreases)
    await this.createLedger({
      accountId: investmentAccount.id,
      txType: 'withdrawal',
      amount: `-${payout.amount}`,
      currency: payout.currency,
      fxRate: (payout.fxRate || '1').toString(),
      amountBase: `-${(parseFloat(payout.amount.toString()) * parseFloat((payout.fxRate || '1').toString())).toString()}`,
      refType: 'investment_payout',
      refId: result.id,
      note: payout.note || `Payout from ${projectName}`,
      createdBy: payout.createdBy
    });

    return result;
  }

  async deleteInvPayout(id: string): Promise<boolean> {
    // First get the payout to know which account to update
    const payout = await this.getInvPayout(id);
    if (!payout) return false;

    // Delete ledger entry (this will also trigger account balance recomputation)
    await this.deleteLedgerByRef('investment_payout', id);
    
    // Delete the payout
    const result = await db.delete(invPayouts).where(eq(invPayouts.id, id));
    
    if (result.rowCount > 0) {
      // Recompute account balance to ensure consistency
      await this.recomputeAccountBalance(payout.toAccountId);
    }

    return result.rowCount > 0;
  }

  async getAllInvPayouts(): Promise<InvPayout[]> {
    return await db.query.invPayouts.findMany({
      orderBy: [desc(invPayouts.createdAt)]
    });
  }

  async getInvPayoutsByProject(projectId: string): Promise<InvPayout[]> {
    return await db.query.invPayouts.findMany({
      where: eq(invPayouts.projectId, projectId),
      orderBy: [desc(invPayouts.createdAt)]
    });
  }


  // Helper methods for investment double-entry bookkeeping
  private async findOrCreateInvestmentAccount(projectId: string, projectName: string, currency: string): Promise<Account> {
    const accountName = `Investment Assets: ${projectName}`;
    
    // Try to find existing investment account for this project
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.name, accountName),
        eq(accounts.currency, currency)
      )
    });
    
    if (existingAccount) {
      return existingAccount;
    }
    
    // Create new investment asset account
    const [newAccount] = await db.insert(accounts).values({
      name: accountName,
      type: 'other',
      currency: currency,
      openingBalance: '0',
      currentBalance: '0',
      status: 'active',
      paymentMethodKey: null,
      color: '#4CAF50', // Green for investment assets
      createdBy: 'system'
    }).returning();
    
    return newAccount;
  }

  private async findOrCreateInvestmentRevenueAccount(projectId: string, projectName: string, currency: string): Promise<Account> {
    const accountName = `Investment Revenue: ${projectName}`;
    
    // Try to find existing revenue account for this project
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.name, accountName),
        eq(accounts.currency, currency)
      )
    });
    
    if (existingAccount) {
      return existingAccount;
    }
    
    // Create new investment revenue account
    const [newAccount] = await db.insert(accounts).values({
      name: accountName,
      type: 'other',
      currency: currency,
      openingBalance: '0',
      currentBalance: '0',
      status: 'active',
      paymentMethodKey: null,
      color: '#2196F3', // Blue for investment revenue
      createdBy: 'system'
    }).returning();
    
    return newAccount;
  }

  // Subscription methods
  async getSubscription(id: string): Promise<Subscription | undefined> {
    const result = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, id)
    });
    return result;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [result] = await db.insert(subscriptions).values(subscription).returning();
    return result;
  }

  async updateSubscription(id: string, subscription: UpdateSubscription): Promise<Subscription | undefined> {
    const [result] = await db.update(subscriptions)
      .set({ ...subscription, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return result;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return result.rowCount > 0;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.query.subscriptions.findMany({
      orderBy: [subscriptions.name]
    });
  }

  async getActiveSubscriptions(): Promise<Subscription[]> {
    return await db.query.subscriptions.findMany({
      where: eq(subscriptions.status, 'active'),
      orderBy: [subscriptions.name]
    });
  }

  async getSubscriptionsDueForAlert(daysFromNow: number): Promise<Subscription[]> {
    // Calculate target date (today + daysFromNow days)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromNow);
    const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    return await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'active'),
        eq(subscriptions.alertEnabled, true),
        eq(subscriptions.nextBillDate, targetDateStr)
      ),
      orderBy: [subscriptions.name]
    });
  }

  // Telegram Settings methods
  async getTelegramSettings(): Promise<TelegramSettings | undefined> {
    const result = await db.query.telegramSettings.findFirst();
    return result;
  }

  async createTelegramSettings(settings: InsertTelegramSettings): Promise<TelegramSettings> {
    const [result] = await db.insert(telegramSettings).values(settings).returning();
    return result;
  }

  async updateTelegramSettings(id: string, settings: UpdateTelegramSettings): Promise<TelegramSettings | undefined> {
    const [result] = await db.update(telegramSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(telegramSettings.id, id))
      .returning();
    return result;
  }

  async testTelegramConnection(botToken: string, chatId: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      if (!response.ok) {
        return false;
      }

      // Test sending a message to the chat
      const testResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: '🔧 Telegram connection test successful!',
        }),
      });

      return testResponse.ok;
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }

  // Work Reports methods
  async getWorkReport(id: string): Promise<WorkReport | undefined> {
    return await db.query.workReports.findFirst({
      where: eq(workReports.id, id)
    });
  }

  async createWorkReport(workReport: InsertWorkReport): Promise<WorkReport> {
    const [result] = await db.insert(workReports).values(workReport).returning();
    return result;
  }

  async updateWorkReport(id: string, workReport: UpdateWorkReport): Promise<WorkReport | undefined> {
    const [result] = await db.update(workReports)
      .set({ ...workReport, updatedAt: new Date() })
      .where(eq(workReports.id, id))
      .returning();
    return result;
  }

  async deleteWorkReport(id: string): Promise<boolean> {
    const result = await db.delete(workReports).where(eq(workReports.id, id));
    return result.rowCount > 0;
  }

  async getAllWorkReports(): Promise<WorkReport[]> {
    return await db.query.workReports.findMany({
      orderBy: [desc(workReports.date), desc(workReports.createdAt)]
    });
  }

  async getWorkReportsByUser(userId: string): Promise<WorkReport[]> {
    return await db.query.workReports.findMany({
      where: eq(workReports.userId, userId),
      orderBy: [desc(workReports.date), desc(workReports.createdAt)]
    });
  }

  async getFilteredWorkReports(filters: {
    userId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    taskDetails?: string;
  }): Promise<WorkReport[]> {
    const conditions: any[] = [];

    if (filters.userId) {
      conditions.push(eq(workReports.userId, filters.userId));
    }

    if (filters.status) {
      conditions.push(eq(workReports.status, filters.status as "submitted" | "approved" | "rejected"));
    }

    if (filters.taskDetails) {
      conditions.push(sql`${workReports.taskDetails} ILIKE ${`%${filters.taskDetails}%`}`);
    }

    if (filters.startDate) {
      conditions.push(gte(workReports.date, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(workReports.date, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db.query.workReports.findMany({
      where: whereClause,
      orderBy: [desc(workReports.date), desc(workReports.createdAt)]
    });
  }

  // Crypto API Settings methods
  async getCryptoApiSettings(): Promise<CryptoApiSettings | undefined> {
    return await db.query.cryptoApiSettings.findFirst();
  }

  async createCryptoApiSettings(settings: InsertCryptoApiSettings): Promise<CryptoApiSettings> {
    const [result] = await db.insert(cryptoApiSettings).values(settings).returning();
    return result;
  }

  async updateCryptoApiSettings(id: string, settings: UpdateCryptoApiSettings): Promise<CryptoApiSettings | undefined> {
    const [result] = await db.update(cryptoApiSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(cryptoApiSettings.id, id))
      .returning();
    return result;
  }

  // Crypto Watchlist methods
  async getCryptoWatchlist(id: string): Promise<CryptoWatchlist | undefined> {
    return await db.query.cryptoWatchlist.findFirst({
      where: eq(cryptoWatchlist.id, id)
    });
  }

  async createCryptoWatchlist(watchlist: InsertCryptoWatchlist): Promise<CryptoWatchlist> {
    const [result] = await db.insert(cryptoWatchlist).values(watchlist).returning();
    return result;
  }

  async deleteCryptoWatchlist(id: string): Promise<boolean> {
    const result = await db.delete(cryptoWatchlist).where(eq(cryptoWatchlist.id, id));
    return result.rowCount > 0;
  }

  async getUserCryptoWatchlist(userId: string): Promise<CryptoWatchlist[]> {
    return await db.query.cryptoWatchlist.findMany({
      where: eq(cryptoWatchlist.userId, userId),
      orderBy: [desc(cryptoWatchlist.addedAt)]
    });
  }

  async checkCoinInWatchlist(userId: string, coinId: string): Promise<CryptoWatchlist | undefined> {
    return await db.query.cryptoWatchlist.findFirst({
      where: and(
        eq(cryptoWatchlist.userId, userId),
        eq(cryptoWatchlist.coinId, coinId)
      )
    });
  }

  // Crypto Alert methods
  async getCryptoAlert(id: string): Promise<CryptoAlert | undefined> {
    return await db.query.cryptoAlerts.findFirst({
      where: eq(cryptoAlerts.id, id)
    });
  }

  async createCryptoAlert(alert: InsertCryptoAlert): Promise<CryptoAlert> {
    const [result] = await db.insert(cryptoAlerts).values(alert).returning();
    return result;
  }

  async updateCryptoAlert(id: string, alert: UpdateCryptoAlert): Promise<CryptoAlert | undefined> {
    const [result] = await db.update(cryptoAlerts)
      .set({ ...alert, updatedAt: new Date() })
      .where(eq(cryptoAlerts.id, id))
      .returning();
    return result;
  }

  async deleteCryptoAlert(id: string): Promise<boolean> {
    const result = await db.delete(cryptoAlerts).where(eq(cryptoAlerts.id, id));
    return result.rowCount > 0;
  }

  async getUserCryptoAlerts(userId: string): Promise<CryptoAlert[]> {
    return await db.query.cryptoAlerts.findMany({
      where: eq(cryptoAlerts.userId, userId),
      orderBy: [desc(cryptoAlerts.createdAt)]
    });
  }

  async getActiveCryptoAlerts(): Promise<CryptoAlert[]> {
    return await db.query.cryptoAlerts.findMany({
      where: eq(cryptoAlerts.status, 'active'),
      orderBy: [desc(cryptoAlerts.createdAt)]
    });
  }

  // Crypto Portfolio methods
  async getCryptoPortfolio(id: string): Promise<CryptoPortfolio | undefined> {
    return await db.query.cryptoPortfolio.findFirst({
      where: eq(cryptoPortfolio.id, id)
    });
  }

  async createCryptoPortfolio(portfolio: InsertCryptoPortfolio): Promise<CryptoPortfolio> {
    const [result] = await db.insert(cryptoPortfolio).values(portfolio).returning();
    return result;
  }

  async updateCryptoPortfolio(id: string, portfolio: UpdateCryptoPortfolio): Promise<CryptoPortfolio | undefined> {
    const [result] = await db.update(cryptoPortfolio)
      .set({ ...portfolio, updatedAt: new Date() })
      .where(eq(cryptoPortfolio.id, id))
      .returning();
    return result;
  }

  async deleteCryptoPortfolio(id: string): Promise<boolean> {
    const result = await db.delete(cryptoPortfolio).where(eq(cryptoPortfolio.id, id));
    return result.rowCount > 0;
  }

  async getUserCryptoPortfolio(userId: string): Promise<CryptoPortfolio[]> {
    return await db.query.cryptoPortfolio.findMany({
      where: eq(cryptoPortfolio.userId, userId),
      orderBy: [desc(cryptoPortfolio.createdAt)]
    });
  }
}