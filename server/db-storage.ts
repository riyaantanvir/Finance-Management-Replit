import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db } from './db';
import { users, tags, paymentMethods, expenses } from '@shared/schema';
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
  type UpdatePaymentMethod
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
}