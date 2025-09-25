import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertExpenseSchema, 
  updateExpenseSchema, 
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
  updateExchangeRateSchema
} from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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
      
      // Check if account has related records
      const hasLedgerEntries = await storage.hasLedgerEntries(id);
      const hasTransfers = await storage.hasAccountTransfers(id);
      
      if (hasLedgerEntries || hasTransfers) {
        return res.status(400).json({ 
          message: "Cannot delete account with existing transactions. Please delete all related transactions first." 
        });
      }
      
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

  const httpServer = createServer(app);
  return httpServer;
}
