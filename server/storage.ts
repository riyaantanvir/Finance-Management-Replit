import { type User, type InsertUser, type Expense, type InsertExpense, type UpdateExpense, type UpdateUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Expense methods
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private expenses: Map<string, Expense>;

  constructor() {
    this.users = new Map();
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
        case 'this-month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last-month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
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

export const storage = new MemStorage();
