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
  type UpdateSubscription
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Tag methods
  getTag(id: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: string, tag: UpdateTag): Promise<Tag | undefined>;
  deleteTag(id: string): Promise<boolean>;
  getAllTags(): Promise<Tag[]>;
  
  // Payment Method methods
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, paymentMethod: UpdatePaymentMethod): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<boolean>;
  getAllPaymentMethods(): Promise<PaymentMethod[]>;
  
  // Expense methods
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  createBulkExpenses(expenses: InsertExpense[]): Promise<Expense[]>;
  updateExpense(id: string, expense: UpdateExpense): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  getAllExpenses(): Promise<Expense[]>;
  getFilteredExpenses(filters: {
    dateRange?: string;
    tag?: string;
    paymentMethod?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Expense[]>;

  // Account methods
  getAccount(id: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, account: UpdateAccount): Promise<Account | undefined>;
  deleteAccount(id: string): Promise<boolean>;
  getAllAccounts(): Promise<Account[]>;
  getActiveAccounts(): Promise<Account[]>;
  updateAccountBalance(id: string, balance: string): Promise<Account | undefined>;

  // Ledger methods
  getLedger(id: string): Promise<Ledger | undefined>;
  createLedger(ledger: InsertLedger): Promise<Ledger>;
  getLedgerByAccount(accountId: string): Promise<Ledger[]>;
  getAllLedger(): Promise<Ledger[]>;
  deleteLedgerByRef(refType: string, refId: string): Promise<boolean>;

  // Transfer methods
  getTransfer(id: string): Promise<Transfer | undefined>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  getAllTransfers(): Promise<Transfer[]>;
  getTransfersByAccount(accountId: string): Promise<Transfer[]>;

  // Exchange Rate methods
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | undefined>;
  createExchangeRate(exchangeRate: InsertExchangeRate): Promise<ExchangeRate>;
  updateExchangeRate(id: string, exchangeRate: UpdateExchangeRate): Promise<ExchangeRate | undefined>;
  deleteExchangeRate(id: string): Promise<boolean>;
  getAllExchangeRates(): Promise<ExchangeRate[]>;
  upsertExchangeRate(fromCurrency: string, toCurrency: string, rate: string): Promise<ExchangeRate>;

  // Settings methods
  getFinanceSettings(): Promise<SettingsFinance | undefined>;
  createFinanceSettings(settings: InsertSettingsFinance): Promise<SettingsFinance>;
  updateFinanceSettings(settings: UpdateSettingsFinance): Promise<SettingsFinance>;
  
  // Account relationship checks
  hasLedgerEntries(accountId: string): Promise<boolean>;
  hasAccountTransfers(accountId: string): Promise<boolean>;

  // Investment Project methods
  getInvProject(id: string): Promise<InvProject | undefined>;
  createInvProject(project: InsertInvProject): Promise<InvProject>;
  updateInvProject(id: string, project: UpdateInvProject): Promise<InvProject | undefined>;
  deleteInvProject(id: string): Promise<boolean>;
  getAllInvProjects(): Promise<InvProject[]>;
  getActiveInvProjects(): Promise<InvProject[]>;

  // Investment Category methods
  getInvCategory(id: string): Promise<InvCategory | undefined>;
  createInvCategory(category: InsertInvCategory): Promise<InvCategory>;
  deleteInvCategory(id: string): Promise<boolean>;
  getInvCategoriesByProject(projectId: string): Promise<InvCategory[]>;
  getAllInvCategories(): Promise<InvCategory[]>;

  // Investment Transaction methods
  getInvTx(id: string): Promise<InvTx | undefined>;
  createInvTx(tx: InsertInvTx): Promise<InvTx>;
  updateInvTx(id: string, tx: UpdateInvTx): Promise<InvTx | undefined>;
  deleteInvTx(id: string): Promise<boolean>;
  getAllInvTx(): Promise<InvTx[]>;
  getInvTxByProject(projectId: string): Promise<InvTx[]>;
  getFilteredInvTx(filters: {
    projectId?: string;
    categoryId?: string;
    direction?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<InvTx[]>;

  // Investment Payout methods
  getInvPayout(id: string): Promise<InvPayout | undefined>;
  createInvPayout(payout: InsertInvPayout): Promise<InvPayout>;
  deleteInvPayout(id: string): Promise<boolean>;
  getAllInvPayouts(): Promise<InvPayout[]>;
  getInvPayoutsByProject(projectId: string): Promise<InvPayout[]>;

  // Subscription methods
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: UpdateSubscription): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
  getAllSubscriptions(): Promise<Subscription[]>;
  getActiveSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsDueForAlert(daysFromNow: number): Promise<Subscription[]>;
}

export class MemStorage {
  private users: Map<string, User>;
  private tags: Map<string, Tag>;
  private paymentMethods: Map<string, PaymentMethod>;
  private expenses: Map<string, Expense>;

  constructor() {
    this.users = new Map();
    this.tags = new Map();
    this.paymentMethods = new Map();
    this.expenses = new Map();
    
    // Create default admin user
    const adminId = randomUUID();
    const adminUser: User = {
      id: adminId,
      username: "Admin",
      password: "Admin",
      dashboardAccess: true,
      expenseEntryAccess: true,
      adminPanelAccess: true,
    };
    this.users.set(adminId, adminUser);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      dashboardAccess: insertUser.dashboardAccess ?? true,
      expenseEntryAccess: insertUser.expenseEntryAccess ?? true,
      adminPanelAccess: insertUser.adminPanelAccess ?? false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateUser: UpdateUser): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser: User = { ...existingUser, ...updateUser };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Tag methods
  async getTag(id: string): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = randomUUID();
    const now = new Date();
    const tag: Tag = { 
      ...insertTag, 
      id,
      description: insertTag.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.tags.set(id, tag);
    return tag;
  }

  async updateTag(id: string, updateTag: UpdateTag): Promise<Tag | undefined> {
    const existingTag = this.tags.get(id);
    if (!existingTag) {
      return undefined;
    }
    
    const updatedTag: Tag = { 
      ...existingTag, 
      ...updateTag,
      updatedAt: new Date(),
    };
    this.tags.set(id, updatedTag);
    return updatedTag;
  }

  async deleteTag(id: string): Promise<boolean> {
    return this.tags.delete(id);
  }

  async getAllTags(): Promise<Tag[]> {
    return Array.from(this.tags.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Payment Method methods
  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    return this.paymentMethods.get(id);
  }

  async createPaymentMethod(insertPaymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const id = randomUUID();
    const now = new Date();
    const paymentMethod: PaymentMethod = { 
      ...insertPaymentMethod, 
      id,
      description: insertPaymentMethod.description ?? null,
      currency: insertPaymentMethod.currency ?? 'BDT',
      createdAt: now,
      updatedAt: now,
    };
    this.paymentMethods.set(id, paymentMethod);
    return paymentMethod;
  }

  async updatePaymentMethod(id: string, updatePaymentMethod: UpdatePaymentMethod): Promise<PaymentMethod | undefined> {
    const existingPaymentMethod = this.paymentMethods.get(id);
    if (!existingPaymentMethod) {
      return undefined;
    }
    
    const updatedPaymentMethod: PaymentMethod = { 
      ...existingPaymentMethod, 
      ...updatePaymentMethod,
      updatedAt: new Date(),
    };
    this.paymentMethods.set(id, updatedPaymentMethod);
    return updatedPaymentMethod;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    return this.paymentMethods.delete(id);
  }

  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return Array.from(this.paymentMethods.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Expense methods
  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const now = new Date();
    const expense: Expense = { 
      ...insertExpense, 
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async createBulkExpenses(insertExpenses: InsertExpense[]): Promise<Expense[]> {
    const now = new Date();
    const expenses: Expense[] = [];
    
    for (const insertExpense of insertExpenses) {
      const id = randomUUID();
      const expense: Expense = {
        ...insertExpense,
        id,
        createdAt: now,
        updatedAt: now,
      };
      this.expenses.set(id, expense);
      expenses.push(expense);
    }
    
    return expenses;
  }

  async updateExpense(id: string, updateExpense: UpdateExpense): Promise<Expense | undefined> {
    const existingExpense = this.expenses.get(id);
    if (!existingExpense) {
      return undefined;
    }
    
    const updatedExpense: Expense = { 
      ...existingExpense, 
      ...updateExpense,
      updatedAt: new Date(),
    };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  async getAllExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getFilteredExpenses(filters: {
    dateRange?: string;
    tag?: string;
    paymentMethod?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Expense[]> {
    let expenses = Array.from(this.expenses.values());

    // Filter by type
    if (filters.type) {
      expenses = expenses.filter(expense => expense.type === filters.type);
    }

    // Filter by tag
    if (filters.tag) {
      expenses = expenses.filter(expense => expense.tag === filters.tag);
    }

    // Filter by payment method
    if (filters.paymentMethod) {
      expenses = expenses.filter(expense => expense.paymentMethod === filters.paymentMethod);
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
            return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
          break;
        default:
          if (filters.startDate && filters.endDate) {
            startDate = new Date(filters.startDate);
            endDate = new Date(filters.endDate);
          } else {
            return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
      }

      expenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }

    return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

import { DatabaseStorage } from './db-storage';

export const storage = new DatabaseStorage();
