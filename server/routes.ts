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
  updateTelegramSettingsSchema
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

  const httpServer = createServer(app);
  return httpServer;
}
