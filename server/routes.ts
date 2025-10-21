import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertExpenseSchema, 
  updateExpenseSchema, 
  insertPlannedPaymentSchema,
  updatePlannedPaymentSchema,
  updateUserSchema,
  insertTagSchema,
  updateTagSchema,
  insertPaymentMethodSchema,
  updatePaymentMethodSchema,
  insertAccountSchema,
  updateAccountSchema,
  insertLedgerSchema,
  insertTransferSchema,
  insertSettingsFinanceSchema,
  updateSettingsFinanceSchema,
  insertExchangeRateSchema,
  updateExchangeRateSchema,
  insertInvProjectSchema,
  updateInvProjectSchema,
  insertInvCategorySchema,
  insertInvTxSchema,
  updateInvTxSchema,
  insertInvPayoutSchema,
  insertSubscriptionSchema,
  updateSubscriptionSchema,
  insertTelegramSettingsSchema,
  updateTelegramSettingsSchema,
  insertWorkReportSchema,
  updateWorkReportSchema
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

// Simple session store for authentication (module-level to persist across hot reloads)
const sessions = new Map<string, { userId: string; createdAt: Date }>();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Clean expired sessions every hour
setInterval(() => {
  const now = new Date();
  sessions.forEach((session, sessionId) => {
    if (now.getTime() - session.createdAt.getTime() > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
    }
  });
}, 60 * 60 * 1000);

// Helper function to validate session and get user
async function validateSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  // Check if session is expired
  if (new Date().getTime() - session.createdAt.getTime() > SESSION_TIMEOUT) {
    sessions.delete(sessionId);
    return null;
  }
  
  const user = await storage.getUser(session.userId);
  return user;
}

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware for work reports authentication
  async function requireWorkReportsAuth(req: any, res: any, next: any) {
    const sessionId = req.query.sessionId || req.body.sessionId;
    const user = await validateSession(sessionId);
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required for work reports" });
    }
    
    req.authenticatedUser = user;
    next();
  }

  // Middleware for crypto access authentication
  async function requireCryptoAccess(req: any, res: any, next: any) {
    const sessionId = req.query.sessionId || req.body.sessionId;
    const user = await validateSession(sessionId);
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!user.cryptoAccess) {
      return res.status(403).json({ message: "Crypto access not enabled for this user" });
    }
    
    req.authenticatedUser = user;
    next();
  }

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, {
        userId: user.id,
        createdAt: new Date()
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword,
        sessionId
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userData = updateUserSchema.parse(req.body);
      
      const user = await storage.updateUser(id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/filtered", async (req, res) => {
    try {
      const { dateRange, tag, paymentMethod, type, startDate, endDate } = req.query;
      
      const filters = {
        dateRange: dateRange as string,
        tag: tag as string,
        paymentMethod: paymentMethod as string,
        type: type as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      const expenses = await storage.getFilteredExpenses(filters);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch filtered expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create expense" });
      }
    }
  });

  app.post("/api/expenses/bulk", async (req, res) => {
    try {
      const { expenses } = req.body;
      
      if (!Array.isArray(expenses) || expenses.length === 0) {
        return res.status(400).json({ message: "Expenses array is required and must not be empty" });
      }

      // Validate each expense
      const validatedExpenses = expenses.map((expense, index) => {
        try {
          return insertExpenseSchema.parse(expense);
        } catch (error) {
          throw new Error(`Invalid expense at index ${index}: ${error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : 'Unknown error'}`);
        }
      });

      const createdExpenses = await storage.createBulkExpenses(validatedExpenses);
      res.status(201).json({ 
        message: `Successfully imported ${createdExpenses.length} expenses`,
        expenses: createdExpenses 
      });
    } catch (error) {
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to import expenses" 
      });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const expenseData = updateExpenseSchema.parse(req.body);
      
      const expense = await storage.updateExpense(id, expenseData);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update expense" });
      }
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExpense(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  app.delete("/api/expenses", async (req, res) => {
    try {
      const deleted = await storage.deleteAllExpenses();
      
      if (!deleted) {
        return res.status(404).json({ message: "No expenses found to delete" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete all expenses" });
    }
  });

  // Planned Payment routes
  app.get("/api/planned-payments", async (req, res) => {
    try {
      const plannedPayments = await storage.getAllPlannedPayments();
      res.json(plannedPayments);
    } catch (error) {
      console.error("Error fetching planned payments:", error);
      res.status(500).json({ message: "Failed to fetch planned payments" });
    }
  });

  app.get("/api/planned-payments/active", async (req, res) => {
    try {
      const plannedPayments = await storage.getActivePlannedPayments();
      res.json(plannedPayments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active planned payments" });
    }
  });

  app.get("/api/planned-payments/tag/:tag", async (req, res) => {
    try {
      const { tag } = req.params;
      const plannedPayments = await storage.getPlannedPaymentsByTag(tag);
      res.json(plannedPayments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch planned payments by tag" });
    }
  });

  app.get("/api/planned-payments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const plannedPayment = await storage.getPlannedPayment(id);
      
      if (!plannedPayment) {
        return res.status(404).json({ message: "Planned payment not found" });
      }

      res.json(plannedPayment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch planned payment" });
    }
  });

  app.post("/api/planned-payments", async (req, res) => {
    try {
      const paymentData = insertPlannedPaymentSchema.parse(req.body);
      const plannedPayment = await storage.createPlannedPayment(paymentData);
      res.status(201).json(plannedPayment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create planned payment" });
      }
    }
  });

  app.put("/api/planned-payments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const paymentData = updatePlannedPaymentSchema.parse(req.body);
      
      const plannedPayment = await storage.updatePlannedPayment(id, paymentData);
      if (!plannedPayment) {
        return res.status(404).json({ message: "Planned payment not found" });
      }

      res.json(plannedPayment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update planned payment" });
      }
    }
  });

  app.delete("/api/planned-payments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePlannedPayment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Planned payment not found" });
      }

      res.json({ message: "Planned payment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete planned payment" });
    }
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      
      const totalIncome = expenses
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
      const totalExpenses = expenses
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
      const netBalance = totalIncome - totalExpenses;
      
      // This month expenses
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthExpenses = expenses
        .filter(e => new Date(e.date) >= startOfMonth && e.type === 'expense')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      res.json({
        totalIncome,
        totalExpenses,
        netBalance,
        thisMonth: thisMonthExpenses,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Dashboard planned payments breakdown
  app.get("/api/dashboard/planned-breakdown", async (req, res) => {
    try {
      // Normalize the period parameter (convert hyphens to underscores)
      const periodParam = req.query.period as string | undefined;
      const period = (periodParam || 'this_month').trim().toLowerCase().replace(/-/g, '_');
      
      const expenses = await storage.getAllExpenses();
      const plannedPayments = await storage.getActivePlannedPayments();
      const tags = await storage.getAllTags();
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let endDate = now;
      
      switch (period) {
        case 'this_week':
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate = new Date(now);
          startDate.setDate(now.getDate() - diff);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      // Group expenses by tag for the selected period
      const tagBreakdown = tags.map(tag => {
        const tagExpenses = expenses.filter(e => 
          e.type === 'expense' && 
          e.tag === tag.name &&
          new Date(e.date) >= startDate &&
          new Date(e.date) <= endDate
        );
        
        const spent = tagExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
        // Find planned payment for this tag
        const plannedPayment = plannedPayments.find(p => p.tag === tag.name);
        let planned = 0;
        
        if (plannedPayment) {
          // Calculate planned amount based on frequency and period
          const amount = parseFloat(plannedPayment.amount);
          
          switch (period) {
            case 'this_week':
              if (plannedPayment.frequency === 'weekly') {
                planned = amount;
              } else if (plannedPayment.frequency === 'daily') {
                planned = amount * 7;
              } else if (plannedPayment.frequency === 'monthly') {
                planned = amount / 4.33; // Average weeks in month
              } else if (plannedPayment.frequency === 'custom') {
                planned = amount; // Custom frequency treated as-is
              }
              break;
              
            case 'this_month':
              if (plannedPayment.frequency === 'monthly' || plannedPayment.frequency === 'custom') {
                planned = amount;
              } else if (plannedPayment.frequency === 'weekly') {
                planned = amount * 4.33; // Average weeks in month
              } else if (plannedPayment.frequency === 'daily') {
                planned = amount * 30; // Average days in month
              }
              break;
              
            case 'this_year':
              if (plannedPayment.frequency === 'monthly') {
                planned = amount * 12;
              } else if (plannedPayment.frequency === 'weekly') {
                planned = amount * 52;
              } else if (plannedPayment.frequency === 'daily') {
                planned = amount * 365;
              } else if (plannedPayment.frequency === 'custom') {
                planned = amount * 12; // Assume yearly for custom
              }
              break;
              
            default:
              planned = 0;
          }
        }
        
        return {
          tag: tag.name,
          spent: spent,
          planned: planned,
          remaining: planned > 0 ? planned - spent : 0,
          percentage: planned > 0 ? (spent / planned) * 100 : 0,
        };
      });
      
      res.json(tagBreakdown.filter(t => t.spent > 0 || t.planned > 0));
    } catch (error) {
      console.error('Dashboard breakdown error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard breakdown" });
    }
  });

  // Tag management routes
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getAllTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(tagData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create tag" });
      }
    }
  });

  app.put("/api/tags/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const tagData = updateTagSchema.parse(req.body);
      
      const tag = await storage.updateTag(id, tagData);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }

      res.json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update tag" });
      }
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTag(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Tag not found" });
      }

      res.json({ message: "Tag deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // Payment method management routes
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const paymentMethods = await storage.getAllPaymentMethods();
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/payment-methods", async (req, res) => {
    try {
      const paymentMethodData = insertPaymentMethodSchema.parse(req.body);
      const paymentMethod = await storage.createPaymentMethod(paymentMethodData);
      res.status(201).json(paymentMethod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create payment method" });
      }
    }
  });

  app.put("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const paymentMethodData = updatePaymentMethodSchema.parse(req.body);
      
      const paymentMethod = await storage.updatePaymentMethod(id, paymentMethodData);
      if (!paymentMethod) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      res.json(paymentMethod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update payment method" });
      }
    }
  });

  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePaymentMethod(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      res.json({ message: "Payment method deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Fund Management - Account routes
  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAllAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/active", async (req, res) => {
    try {
      const accounts = await storage.getActiveAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active accounts" });
    }
  });

  // Export accounts to CSV
  app.get("/api/accounts/export", async (req, res) => {
    try {
      const accounts = await storage.getAllAccounts();
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=accounts_export.csv');
      
      // Create CSV content
      const csvHeader = 'name,type,currency,openingBalance,paymentMethodKey,status\n';
      const csvRows = accounts.map(account => 
        `"${account.name}","${account.type}","${account.currency}","${account.openingBalance}","${account.paymentMethodKey || ""}","${account.status}"`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      res.send(csvContent);
    } catch (error) {
      console.error('Account export error:', error);
      res.status(500).json({ 
        message: "Failed to export accounts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const account = await storage.getAccount(id);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const accountData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create account" });
      }
    }
  });

  app.put("/api/accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const accountData = updateAccountSchema.parse(req.body);
      
      const account = await storage.updateAccount(id, accountData);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update account" });
      }
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Delete account - CASCADE will automatically handle related ledger entries and transfers
      const deleted = await storage.deleteAccount(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ 
        message: "Failed to delete account", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Bulk import accounts from CSV
  app.post("/api/accounts/bulk", async (req, res) => {
    try {
      const { accounts } = req.body;
      
      if (!Array.isArray(accounts) || accounts.length === 0) {
        return res.status(400).json({ message: "Invalid request: accounts array is required" });
      }

      // Validate each account
      const validAccounts = [];
      const errors = [];

      for (let i = 0; i < accounts.length; i++) {
        const accountData = accounts[i];
        try {
          const validatedAccount = insertAccountSchema.parse(accountData);
          validAccounts.push(validatedAccount);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`Account ${i + 1}: ${error.errors.map(e => e.message).join(', ')}`);
          } else {
            errors.push(`Account ${i + 1}: Invalid data`);
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "Validation errors", 
          errors 
        });
      }

      // Create all valid accounts
      const createdAccounts = [];
      for (const accountData of validAccounts) {
        try {
          const account = await storage.createAccount(accountData);
          createdAccounts.push(account);
        } catch (error) {
          console.error('Failed to create account:', error);
          return res.status(500).json({ 
            message: `Failed to create account: ${accountData.name}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.status(201).json({
        message: `Successfully imported ${createdAccounts.length} accounts`,
        accounts: createdAccounts
      });
    } catch (error) {
      console.error('Bulk account import error:', error);
      res.status(500).json({ 
        message: "Failed to import accounts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Fund Management - Ledger routes
  app.get("/api/ledger", async (req, res) => {
    try {
      const ledger = await storage.getAllLedger();
      res.json(ledger);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ledger entries" });
    }
  });

  app.get("/api/ledger/account/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const ledger = await storage.getLedgerByAccount(accountId);
      res.json(ledger);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account ledger" });
    }
  });

  app.post("/api/ledger", async (req, res) => {
    try {
      const ledgerData = insertLedgerSchema.parse(req.body);
      
      // Validate that the account exists
      const account = await storage.getAccount(ledgerData.accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const ledgerEntry = await storage.createLedger(ledgerData);
      res.status(201).json(ledgerEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create ledger entry" });
      }
    }
  });

  // Fund Management - Transfer routes
  app.get("/api/transfers", async (req, res) => {
    try {
      const transfers = await storage.getAllTransfers();
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transfers" });
    }
  });

  app.get("/api/transfers/account/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const transfers = await storage.getTransfersByAccount(accountId);
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account transfers" });
    }
  });

  app.post("/api/transfers", async (req, res) => {
    try {
      const transferData = insertTransferSchema.parse(req.body);
      
      // Validate that from and to accounts are different
      if (transferData.fromAccountId === transferData.toAccountId) {
        return res.status(400).json({ message: "Cannot transfer to the same account" });
      }

      // Validate that both accounts exist and are active
      const [fromAccount, toAccount] = await Promise.all([
        storage.getAccount(transferData.fromAccountId),
        storage.getAccount(transferData.toAccountId)
      ]);

      if (!fromAccount) {
        return res.status(404).json({ message: "From account not found" });
      }

      if (!toAccount) {
        return res.status(404).json({ message: "To account not found" });
      }

      if (fromAccount.status !== 'active') {
        return res.status(400).json({ message: "From account is not active" });
      }

      if (toAccount.status !== 'active') {
        return res.status(400).json({ message: "To account is not active" });
      }

      // Create transfer with double-entry ledger entries (handled by DatabaseStorage.createTransfer)
      const transfer = await storage.createTransfer(transferData);
      res.status(201).json(transfer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create transfer" });
      }
    }
  });

  // Fund Management - Settings routes
  app.get("/api/settings/finance", async (req, res) => {
    try {
      const settings = await storage.getFinanceSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch finance settings" });
    }
  });

  app.put("/api/settings/finance", async (req, res) => {
    try {
      const settingsData = updateSettingsFinanceSchema.parse(req.body);
      
      // Ensure settings exist first (this will create defaults if missing)
      await storage.getFinanceSettings();
      
      const settings = await storage.updateFinanceSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update finance settings" });
      }
    }
  });

  app.post("/api/settings/finance", async (req, res) => {
    try {
      const settingsData = insertSettingsFinanceSchema.parse(req.body);
      
      // Use the dedicated create method for POST requests
      const settings = await storage.createFinanceSettings(settingsData);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else if (error instanceof Error && error.message.includes("already exist")) {
        res.status(409).json({ message: "Finance settings already exist. Use PUT to update." });
      } else {
        res.status(500).json({ message: "Failed to create finance settings" });
      }
    }
  });

  // Exchange Rate management routes
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const exchangeRates = await storage.getAllExchangeRates();
      res.json(exchangeRates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  app.get("/api/exchange-rates/:fromCurrency/:toCurrency", async (req, res) => {
    try {
      const { fromCurrency, toCurrency } = req.params;
      const exchangeRate = await storage.getExchangeRate(fromCurrency, toCurrency);
      
      if (!exchangeRate) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }
      
      res.json(exchangeRate);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exchange rate" });
    }
  });

  app.post("/api/exchange-rates", async (req, res) => {
    try {
      const exchangeRateData = insertExchangeRateSchema.parse(req.body);
      const exchangeRate = await storage.createExchangeRate(exchangeRateData);
      res.status(201).json(exchangeRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create exchange rate" });
      }
    }
  });

  app.put("/api/exchange-rates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const exchangeRateData = updateExchangeRateSchema.parse(req.body);
      
      const exchangeRate = await storage.updateExchangeRate(id, exchangeRateData);
      if (!exchangeRate) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }

      res.json(exchangeRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update exchange rate" });
      }
    }
  });

  app.delete("/api/exchange-rates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExchangeRate(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }

      res.json({ message: "Exchange rate deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exchange rate" });
    }
  });

  // Upsert exchange rate (create or update)
  app.put("/api/exchange-rates/:fromCurrency/:toCurrency", async (req, res) => {
    try {
      const { fromCurrency, toCurrency } = req.params;
      const { rate } = req.body;
      
      if (!rate || isNaN(parseFloat(rate))) {
        return res.status(400).json({ message: "Valid rate is required" });
      }
      
      const exchangeRate = await storage.upsertExchangeRate(fromCurrency, toCurrency, rate);
      res.json(exchangeRate);
    } catch (error) {
      res.status(500).json({ message: "Failed to upsert exchange rate" });
    }
  });

  // Investment Project routes
  app.get("/api/inv-projects", async (req, res) => {
    try {
      const projects = await storage.getAllInvProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investment projects" });
    }
  });

  app.get("/api/inv-projects/active", async (req, res) => {
    try {
      const projects = await storage.getActiveInvProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active investment projects" });
    }
  });

  app.get("/api/inv-projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getInvProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Investment project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investment project" });
    }
  });

  app.post("/api/inv-projects", async (req, res) => {
    try {
      const projectData = insertInvProjectSchema.parse(req.body);
      const project = await storage.createInvProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create investment project" });
      }
    }
  });

  app.put("/api/inv-projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const projectData = updateInvProjectSchema.parse(req.body);
      
      const project = await storage.updateInvProject(id, projectData);
      if (!project) {
        return res.status(404).json({ message: "Investment project not found" });
      }

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update investment project" });
      }
    }
  });

  app.delete("/api/inv-projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvProject(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Investment project not found" });
      }

      res.json({ message: "Investment project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete investment project" });
    }
  });

  // Investment Category routes
  app.get("/api/inv-categories", async (req, res) => {
    try {
      const categories = await storage.getAllInvCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investment categories" });
    }
  });

  app.get("/api/inv-categories/project/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const categories = await storage.getInvCategoriesByProject(projectId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project categories" });
    }
  });

  app.post("/api/inv-categories", async (req, res) => {
    try {
      const categoryData = insertInvCategorySchema.parse(req.body);
      
      // Validate that the project exists
      const project = await storage.getInvProject(categoryData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const category = await storage.createInvCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create investment category" });
      }
    }
  });

  app.delete("/api/inv-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Investment category not found" });
      }

      res.json({ message: "Investment category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete investment category" });
    }
  });

  // Investment Transaction routes
  app.get("/api/inv-tx", async (req, res) => {
    try {
      const { projectId, categoryId, direction, accountId, startDate, endDate } = req.query;
      
      const filters = {
        projectId: projectId as string,
        categoryId: categoryId as string,
        direction: direction as string,
        accountId: accountId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (!filters[key as keyof typeof filters]) {
          delete filters[key as keyof typeof filters];
        }
      });

      const transactions = Object.keys(filters).length > 0 
        ? await storage.getFilteredInvTx(filters)
        : await storage.getAllInvTx();
        
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investment transactions" });
    }
  });

  app.get("/api/inv-tx/project/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const transactions = await storage.getInvTxByProject(projectId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project transactions" });
    }
  });

  app.get("/api/inv-tx/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getInvTx(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Investment transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investment transaction" });
    }
  });

  app.post("/api/inv-tx", async (req, res) => {
    try {
      const txData = insertInvTxSchema.parse(req.body);
      
      // Validate that the project exists
      const project = await storage.getInvProject(txData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate that the category exists
      const category = await storage.getInvCategory(txData.categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      // Validate that the account exists
      const account = await storage.getAccount(txData.accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const transaction = await storage.createInvTx(txData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error('Investment transaction creation error:', error);
        res.status(500).json({ message: "Failed to create investment transaction" });
      }
    }
  });

  app.put("/api/inv-tx/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const txData = updateInvTxSchema.parse(req.body);
      
      const transaction = await storage.updateInvTx(id, txData);
      if (!transaction) {
        return res.status(404).json({ message: "Investment transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error('Investment transaction update error:', error);
        res.status(500).json({ message: "Failed to update investment transaction" });
      }
    }
  });

  app.delete("/api/inv-tx/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvTx(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Investment transaction not found" });
      }

      res.json({ message: "Investment transaction deleted successfully" });
    } catch (error) {
      console.error('Investment transaction deletion error:', error);
      res.status(500).json({ message: "Failed to delete investment transaction" });
    }
  });

  // Investment Payout routes
  app.get("/api/inv-payouts", async (req, res) => {
    try {
      const payouts = await storage.getAllInvPayouts();
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch investment payouts" });
    }
  });

  app.get("/api/inv-payouts/project/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const payouts = await storage.getInvPayoutsByProject(projectId);
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project payouts" });
    }
  });

  app.post("/api/inv-payouts", async (req, res) => {
    try {
      const payoutData = insertInvPayoutSchema.parse(req.body);
      
      // Validate that the project exists
      const project = await storage.getInvProject(payoutData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate that the account exists
      const account = await storage.getAccount(payoutData.toAccountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const payout = await storage.createInvPayout(payoutData);
      res.status(201).json(payout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error('Investment payout creation error:', error);
        res.status(500).json({ message: "Failed to create investment payout" });
      }
    }
  });

  app.delete("/api/inv-payouts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvPayout(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Investment payout not found" });
      }

      res.json({ message: "Investment payout deleted successfully" });
    } catch (error) {
      console.error('Investment payout deletion error:', error);
      res.status(500).json({ message: "Failed to delete investment payout" });
    }
  });

  // Subscription routes
  app.get("/api/subscriptions", async (req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error('Subscription fetch error:', error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.get("/api/subscriptions/active", async (req, res) => {
    try {
      const subscriptions = await storage.getActiveSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error('Active subscription fetch error:', error);
      res.status(500).json({ message: "Failed to fetch active subscriptions" });
    }
  });

  app.get("/api/subscriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subscription = await storage.getSubscription(id);
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(subscription);
    } catch (error) {
      console.error('Subscription fetch error:', error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const subscriptionData = insertSubscriptionSchema.parse(req.body);
      
      // Validate that the account exists
      const account = await storage.getAccount(subscriptionData.accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const subscription = await storage.createSubscription(subscriptionData);
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error('Subscription creation error:', error);
        res.status(500).json({ message: "Failed to create subscription" });
      }
    }
  });

  app.put("/api/subscriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subscriptionData = updateSubscriptionSchema.parse(req.body);
      
      // If accountId is being updated, validate that the account exists
      if (subscriptionData.accountId) {
        const account = await storage.getAccount(subscriptionData.accountId);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
      }

      const subscription = await storage.updateSubscription(id, subscriptionData);
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error('Subscription update error:', error);
        res.status(500).json({ message: "Failed to update subscription" });
      }
    }
  });

  app.delete("/api/subscriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSubscription(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json({ message: "Subscription deleted successfully" });
    } catch (error) {
      console.error('Subscription deletion error:', error);
      res.status(500).json({ message: "Failed to delete subscription" });
    }
  });

  app.post("/api/subscriptions/:id/mark-paid", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get subscription details
      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      // Validate account exists
      const account = await storage.getAccount(subscription.accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Get exchange rate for currency conversion
      let fxRate = "1";
      let amountBase = subscription.amount;
      
      if (subscription.currency !== account.currency) {
        const exchangeRate = await storage.getExchangeRate(subscription.currency, account.currency);
        if (exchangeRate) {
          fxRate = exchangeRate.rate;
          const rate = parseFloat(fxRate);
          const amount = parseFloat(subscription.amount);
          amountBase = (amount * rate).toFixed(2);
        } else {
          // Fallback: If no exchange rate found, use 1:1 conversion and log a warning
          console.warn(`No exchange rate found for ${subscription.currency} to ${account.currency}, using 1:1 conversion`);
          fxRate = "1";
          amountBase = subscription.amount;
        }
      }

      // Create ledger entry as an expense
      const ledgerData = {
        accountId: subscription.accountId,
        txType: 'expense' as const,
        amount: subscription.amount,
        currency: subscription.currency,
        fxRate: fxRate,
        amountBase: amountBase,
        refType: 'subscription',
        refId: subscription.id,
        note: `Subscription Payment: ${subscription.name}`
      };

      await storage.createLedger(ledgerData);

      // Update subscription's next bill date (+1 month)
      const currentNextBillDate = new Date(subscription.nextBillDate);
      const nextBillDate = new Date(currentNextBillDate);
      nextBillDate.setMonth(nextBillDate.getMonth() + 1);
      
      const updatedSubscription = await storage.updateSubscription(id, {
        nextBillDate: nextBillDate.toISOString().split('T')[0] // YYYY-MM-DD format
      });

      res.json({ 
        message: "Subscription marked as paid successfully",
        subscription: updatedSubscription 
      });
    } catch (error) {
      console.error('Mark paid error:', error);
      res.status(500).json({ message: "Failed to mark subscription as paid" });
    }
  });

  // Telegram Settings routes
  app.get("/api/telegram-settings", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Telegram settings" });
    }
  });

  app.post("/api/telegram-settings", async (req, res) => {
    try {
      const settingsData = insertTelegramSettingsSchema.parse(req.body);
      const settings = await storage.createTelegramSettings(settingsData);
      res.status(201).json(settings);
    } catch (error) {
      console.error('Create telegram settings error:', error);
      res.status(500).json({ message: "Failed to create Telegram settings" });
    }
  });

  app.put("/api/telegram-settings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const settingsData = updateTelegramSettingsSchema.parse(req.body);
      const settings = await storage.updateTelegramSettings(id, settingsData);
      
      if (!settings) {
        return res.status(404).json({ message: "Telegram settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Update telegram settings error:', error);
      res.status(500).json({ message: "Failed to update Telegram settings" });
    }
  });

  app.post("/api/telegram-settings/test", async (req, res) => {
    try {
      const { botToken, chatId } = req.body;
      
      if (!botToken || !chatId) {
        return res.status(400).json({ message: "Bot token and chat ID are required" });
      }
      
      const isConnected = await storage.testTelegramConnection(botToken, chatId);
      res.json({ connected: isConnected });
    } catch (error) {
      console.error('Test telegram connection error:', error);
      res.status(500).json({ message: "Failed to test Telegram connection" });
    }
  });

  app.post("/api/telegram-settings/send-report", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      
      if (!settings || !settings.botToken || !settings.chatId) {
        return res.status(400).json({ message: "Telegram not configured. Please configure bot token and chat ID first." });
      }
      
      // Import telegramService and send daily report
      const { telegramService } = await import('./telegram');
      const success = await telegramService.sendDailyReport();
      
      if (success) {
        res.json({ message: "Daily report sent successfully", success: true });
      } else {
        res.status(500).json({ message: "Failed to send daily report", success: false });
      }
    } catch (error) {
      console.error('Send daily report error:', error);
      res.status(500).json({ message: "Failed to send daily report" });
    }
  });

  app.post("/api/telegram-settings/test-work-report", async (req, res) => {
    try {
      const settings = await storage.getTelegramSettings();
      
      if (!settings || !settings.botToken || !settings.chatId) {
        return res.status(400).json({ message: "Telegram not configured. Please configure bot token and chat ID first." });
      }
      
      // Import telegramService and send test work report notification
      const { telegramService } = await import('./telegram');
      const success = await telegramService.sendWorkReportNotification(
        "Test User",
        "Test work report notification - This is a sample notification to verify the system is working correctly.",
        "8.5",
        new Date().toLocaleDateString()
      );
      
      if (success) {
        res.json({ message: "Test work report notification sent successfully", success: true });
      } else {
        res.status(500).json({ message: "Failed to send test work report notification. Check if work report notifications are enabled in settings.", success: false });
      }
    } catch (error) {
      console.error('Send test work report notification error:', error);
      res.status(500).json({ message: "Failed to send test work report notification" });
    }
  });

  // Work Reports routes
  app.get("/api/work-reports", requireWorkReportsAuth, async (req: any, res) => {
    try {
      const { userId, startDate, endDate, status, taskDetails } = req.query;
      const authenticatedUser = req.authenticatedUser;

      // Role-based access control
      let targetUserId = userId as string;
      if (!authenticatedUser.adminPanelAccess) {
        // Non-admin users can only view their own reports
        targetUserId = authenticatedUser.id;
      }
      
      const filters = {
        userId: targetUserId,
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string,
        taskDetails: taskDetails as string
      };

      const workReports = await storage.getFilteredWorkReports(filters);
      res.json(workReports);
    } catch (error) {
      console.error('Fetch work reports error:', error);
      res.status(500).json({ message: "Failed to fetch work reports" });
    }
  });

  app.get("/api/work-reports/:id", requireWorkReportsAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const authenticatedUser = req.authenticatedUser;

      const workReport = await storage.getWorkReport(id);
      
      if (!workReport) {
        return res.status(404).json({ message: "Work report not found" });
      }

      // Role-based access control
      if (!authenticatedUser.adminPanelAccess && workReport.userId !== authenticatedUser.id) {
        return res.status(403).json({ message: "Access denied. You can only view your own reports." });
      }

      res.json(workReport);
    } catch (error) {
      console.error('Fetch work report error:', error);
      res.status(500).json({ message: "Failed to fetch work report" });
    }
  });

  app.post("/api/work-reports", requireWorkReportsAuth, async (req: any, res) => {
    try {
      const { sessionId, ...workReportData } = req.body;
      const authenticatedUser = req.authenticatedUser;

      const validatedData = insertWorkReportSchema.parse(workReportData);
      
      // Role-based access control for creating reports
      if (!authenticatedUser.adminPanelAccess && validatedData.userId !== authenticatedUser.id) {
        return res.status(403).json({ message: "Access denied. You can only create reports for yourself." });
      }

      const workReport = await storage.createWorkReport(validatedData);
      
      // Send Telegram notification for work report
      try {
        const { telegramService } = await import('./telegram');
        const user = await storage.getUser(workReport.userId);
        if (user) {
          await telegramService.sendWorkReportNotification(
            user.username,
            workReport.taskDetails,
            workReport.hours,
            workReport.date
          );
        }
      } catch (notificationError) {
        console.error('Failed to send work report notification:', notificationError);
        // Don't fail the entire request if notification fails
      }
      
      res.status(201).json(workReport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error('Create work report error:', error);
        res.status(500).json({ message: "Failed to create work report" });
      }
    }
  });

  app.put("/api/work-reports/:id", requireWorkReportsAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { sessionId, ...workReportData } = req.body;
      const authenticatedUser = req.authenticatedUser;

      // Check if work report exists
      const existingReport = await storage.getWorkReport(id);
      if (!existingReport) {
        return res.status(404).json({ message: "Work report not found" });
      }

      // Role-based access control
      if (!authenticatedUser.adminPanelAccess && existingReport.userId !== authenticatedUser.id) {
        return res.status(403).json({ message: "Access denied. You can only update your own reports." });
      }

      const validatedData = updateWorkReportSchema.parse(workReportData);
      const workReport = await storage.updateWorkReport(id, validatedData);
      
      res.json(workReport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error('Update work report error:', error);
        res.status(500).json({ message: "Failed to update work report" });
      }
    }
  });

  app.delete("/api/work-reports/:id", requireWorkReportsAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const authenticatedUser = req.authenticatedUser;

      // Check if work report exists
      const existingReport = await storage.getWorkReport(id);
      if (!existingReport) {
        return res.status(404).json({ message: "Work report not found" });
      }

      // Role-based access control
      if (!authenticatedUser.adminPanelAccess && existingReport.userId !== authenticatedUser.id) {
        return res.status(403).json({ message: "Access denied. You can only delete your own reports." });
      }
      
      const deleted = await storage.deleteWorkReport(id);
      res.json({ message: "Work report deleted successfully" });
    } catch (error) {
      console.error('Delete work report error:', error);
      res.status(500).json({ message: "Failed to delete work report" });
    }
  });

  // Get work reports by user
  app.get("/api/work-reports/user/:userId", requireWorkReportsAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const authenticatedUser = req.authenticatedUser;

      // Role-based access control
      if (!authenticatedUser.adminPanelAccess && userId !== authenticatedUser.id) {
        return res.status(403).json({ message: "Access denied. You can only view your own reports." });
      }

      const workReports = await storage.getWorkReportsByUser(userId);
      res.json(workReports);
    } catch (error) {
      console.error('Fetch user work reports error:', error);
      res.status(500).json({ message: "Failed to fetch user work reports" });
    }
  });

  // Crypto API Settings routes (Admin only)
  app.get("/api/crypto/settings", requireCryptoAccess, async (req: any, res) => {
    try {
      const settings = await storage.getCryptoApiSettings();
      res.json(settings || {});
    } catch (error) {
      console.error('Fetch crypto settings error:', error);
      res.status(500).json({ message: "Failed to fetch crypto settings" });
    }
  });

  app.put("/api/crypto/settings", requireCryptoAccess, async (req: any, res) => {
    try {
      const existingSettings = await storage.getCryptoApiSettings();
      let result;
      
      if (existingSettings) {
        result = await storage.updateCryptoApiSettings(existingSettings.id, req.body);
      } else {
        result = await storage.createCryptoApiSettings(req.body);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Update crypto settings error:', error);
      res.status(500).json({ message: "Failed to update crypto settings" });
    }
  });

  // Crypto Watchlist routes
  app.get("/api/crypto/watchlist", requireCryptoAccess, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const watchlist = await storage.getUserCryptoWatchlist(userId);
      res.json(watchlist);
    } catch (error) {
      console.error('Fetch watchlist error:', error);
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/crypto/watchlist", requireCryptoAccess, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const existing = await storage.checkCoinInWatchlist(userId, req.body.coinId);
      
      if (existing) {
        return res.status(400).json({ message: "Coin already in watchlist" });
      }
      
      const watchlist = await storage.createCryptoWatchlist({
        ...req.body,
        userId
      });
      res.json(watchlist);
    } catch (error) {
      console.error('Add to watchlist error:', error);
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/crypto/watchlist/:id", requireCryptoAccess, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.authenticatedUser.id;
      
      const existing = await storage.getCryptoWatchlist(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Watchlist item not found" });
      }
      
      await storage.deleteCryptoWatchlist(id);
      res.json({ message: "Removed from watchlist" });
    } catch (error) {
      console.error('Delete from watchlist error:', error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  // Crypto Alerts routes
  app.get("/api/crypto/alerts", requireCryptoAccess, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const alerts = await storage.getUserCryptoAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error('Fetch alerts error:', error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/crypto/alerts", requireCryptoAccess, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const alert = await storage.createCryptoAlert({
        ...req.body,
        userId
      });
      res.json(alert);
    } catch (error) {
      console.error('Create alert error:', error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });

  app.put("/api/crypto/alerts/:id", requireCryptoAccess, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.authenticatedUser.id;
      
      const existing = await storage.getCryptoAlert(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      const alert = await storage.updateCryptoAlert(id, req.body);
      res.json(alert);
    } catch (error) {
      console.error('Update alert error:', error);
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  app.delete("/api/crypto/alerts/:id", requireCryptoAccess, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.authenticatedUser.id;
      
      const existing = await storage.getCryptoAlert(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      await storage.deleteCryptoAlert(id);
      res.json({ message: "Alert deleted" });
    } catch (error) {
      console.error('Delete alert error:', error);
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  // Crypto Portfolio routes
  app.get("/api/crypto/portfolio", requireCryptoAccess, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const portfolio = await storage.getUserCryptoPortfolio(userId);
      res.json(portfolio);
    } catch (error) {
      console.error('Fetch portfolio error:', error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  app.post("/api/crypto/portfolio", requireCryptoAccess, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const portfolio = await storage.createCryptoPortfolio({
        ...req.body,
        userId
      });
      res.json(portfolio);
    } catch (error) {
      console.error('Create portfolio entry error:', error);
      res.status(500).json({ message: "Failed to create portfolio entry" });
    }
  });

  app.put("/api/crypto/portfolio/:id", requireCryptoAccess, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.authenticatedUser.id;
      
      const existing = await storage.getCryptoPortfolio(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Portfolio entry not found" });
      }
      
      const portfolio = await storage.updateCryptoPortfolio(id, req.body);
      res.json(portfolio);
    } catch (error) {
      console.error('Update portfolio error:', error);
      res.status(500).json({ message: "Failed to update portfolio entry" });
    }
  });

  app.delete("/api/crypto/portfolio/:id", requireCryptoAccess, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.authenticatedUser.id;
      
      const existing = await storage.getCryptoPortfolio(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Portfolio entry not found" });
      }
      
      await storage.deleteCryptoPortfolio(id);
      res.json({ message: "Portfolio entry deleted" });
    } catch (error) {
      console.error('Delete portfolio error:', error);
      res.status(500).json({ message: "Failed to delete portfolio entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
