import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for Fund Management
export const accountTypeEnum = pgEnum("account_type", ["cash", "mobile_wallet", "bank_account", "card", "crypto", "other"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "archived"]);
export const txTypeEnum = pgEnum("tx_type", ["opening_balance", "deposit", "withdrawal", "expense", "income", "transfer_in", "transfer_out", "adjustment"]);

// Enums for Investment Management
export const projectTypeEnum = pgEnum("project_type", ["gher", "capital", "other"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "closed"]);
export const categoryKindEnum = pgEnum("category_kind", ["cost", "income"]);
export const transactionDirectionEnum = pgEnum("transaction_direction", ["income", "cost"]);

// Enums for Subscription Management
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "paused"]);

// Enums for Work Reports
export const workReportStatusEnum = pgEnum("work_report_status", ["submitted", "approved", "rejected"]);

// Enums for Crypto Management
export const cryptoAlertTypeEnum = pgEnum("crypto_alert_type", ["price_above", "price_below", "percent_change_up", "percent_change_down"]);
export const cryptoAlertStatusEnum = pgEnum("crypto_alert_status", ["active", "triggered", "disabled"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  dashboardAccess: boolean("dashboard_access").default(true),
  expenseEntryAccess: boolean("expense_entry_access").default(true),
  adminPanelAccess: boolean("admin_panel_access").default(false),
  advantixAgencyAccess: boolean("advantix_agency_access").default(false),
  investmentManagementAccess: boolean("investment_management_access").default(false),
  fundManagementAccess: boolean("fund_management_access").default(false),
  subscriptionsAccess: boolean("subscriptions_access").default(false),
  cryptoAccess: boolean("crypto_access").default(false),
});

export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  currency: text("currency").notNull().default("BDT"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  details: text("details").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tag: text("tag").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fund Management Tables
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  currency: text("currency").notNull().default("BDT"),
  openingBalance: decimal("opening_balance", { precision: 18, scale: 2 }).notNull().default("0"),
  currentBalance: decimal("current_balance", { precision: 18, scale: 2 }).notNull().default("0"),
  paymentMethodKey: text("payment_method_key"), // links to existing Payment Method list
  color: text("color"),
  status: accountStatusEnum("status").notNull().default("active"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ledger = pgTable("ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  txType: txTypeEnum("tx_type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  fxRate: decimal("fx_rate", { precision: 18, scale: 6 }).notNull().default("1"),
  amountBase: decimal("amount_base", { precision: 18, scale: 2 }).notNull(),
  refType: text("ref_type"), // "expense", "income", "transfer", etc.
  refId: text("ref_id"),
  note: text("note"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transfers = pgTable("transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromAccountId: varchar("from_account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  toAccountId: varchar("to_account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  fxRate: decimal("fx_rate", { precision: 18, scale: 6 }).notNull().default("1"),
  fee: decimal("fee", { precision: 18, scale: 2 }).notNull().default("0"),
  note: text("note"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  rate: decimal("rate", { precision: 18, scale: 6 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settingsFinance = pgTable("settings_finance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  baseCurrency: text("base_currency").notNull().default("BDT"),
  allowNegativeBalances: boolean("allow_negative_balances").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const telegramSettings = pgTable("telegram_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  botToken: text("bot_token"),
  chatId: text("chat_id"),
  alertTime: text("alert_time").notNull().default("09:00"),
  reportTime: text("report_time").notNull().default("21:00"),
  workReportNotification: boolean("work_report_notification").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Management Tables
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  nextBillDate: text("next_bill_date").notNull(),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  cardLast4: varchar("card_last4", { length: 4 }),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  alertEnabled: boolean("alert_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investment Management Tables
export const invProjects = pgTable("inv_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: projectTypeEnum("type").notNull().default("other"),
  startDate: text("start_date").notNull(),
  status: projectStatusEnum("status").notNull().default("active"),
  currency: text("currency").notNull().default("BDT"),
  initialAmount: decimal("initial_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invCategories = pgTable("inv_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => invProjects.id),
  name: text("name").notNull(),
  kind: categoryKindEnum("kind").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invTx = pgTable("inv_tx", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => invProjects.id),
  categoryId: varchar("category_id").notNull().references(() => invCategories.id),
  date: text("date").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  direction: transactionDirectionEnum("direction").notNull(),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  currency: text("currency").notNull(),
  fxRate: decimal("fx_rate", { precision: 18, scale: 6 }).notNull().default("1"),
  amountBase: decimal("amount_base", { precision: 18, scale: 2 }).notNull(),
  note: text("note"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invPayouts = pgTable("inv_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => invProjects.id),
  date: text("date").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  toAccountId: varchar("to_account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  currency: text("currency").notNull(),
  fxRate: decimal("fx_rate", { precision: 18, scale: 6 }).notNull().default("1"),
  note: text("note"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Work Reports Table
export const workReports = pgTable("work_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: text("date").notNull(),
  taskDetails: text("task_details").notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  status: workReportStatusEnum("status").notNull().default("submitted"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Crypto Management Tables
export const cryptoApiSettings = pgTable("crypto_api_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coinGeckoApiKey: text("coingecko_api_key"),
  cryptoNewsApiKey: text("cryptonews_api_key"),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cryptoWatchlist = pgTable("crypto_watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  coinId: text("coin_id").notNull(),
  coinSymbol: text("coin_symbol").notNull(),
  coinName: text("coin_name").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => ({
  uniqueUserCoin: sql`unique(user_id, coin_id)`,
}));

export const cryptoAlerts = pgTable("crypto_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  coinId: text("coin_id").notNull(),
  coinSymbol: text("coin_symbol").notNull(),
  alertType: cryptoAlertTypeEnum("alert_type").notNull(),
  targetValue: decimal("target_value", { precision: 18, scale: 8 }).notNull(),
  status: cryptoAlertStatusEnum("status").notNull().default("active"),
  notifyTelegram: boolean("notify_telegram").notNull().default(true),
  notifyEmail: boolean("notify_email").notNull().default(false),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cryptoPortfolio = pgTable("crypto_portfolio", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  coinId: text("coin_id").notNull(),
  coinSymbol: text("coin_symbol").notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  buyPrice: decimal("buy_price", { precision: 18, scale: 8 }).notNull(),
  buyDate: text("buy_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Fund Management Schemas
export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLedgerSchema = createInsertSchema(ledger).omit({
  id: true,
  createdAt: true,
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  createdAt: true,
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  updatedAt: true,
});

export const insertSettingsFinanceSchema = createInsertSchema(settingsFinance).omit({
  id: true,
  updatedAt: true,
});

export const insertTelegramSettingsSchema = createInsertSchema(telegramSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Investment Management Schemas
export const insertInvProjectSchema = createInsertSchema(invProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvCategorySchema = createInsertSchema(invCategories).omit({
  id: true,
  createdAt: true,
});

export const insertInvTxSchema = createInsertSchema(invTx).omit({
  id: true,
  createdAt: true,
});

export const insertInvPayoutSchema = createInsertSchema(invPayouts).omit({
  id: true,
  createdAt: true,
});

// Subscription Management Schemas
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Work Reports Schemas
export const insertWorkReportSchema = createInsertSchema(workReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Crypto Management Schemas
export const insertCryptoApiSettingsSchema = createInsertSchema(cryptoApiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCryptoWatchlistSchema = createInsertSchema(cryptoWatchlist).omit({
  id: true,
  addedAt: true,
});

export const insertCryptoAlertSchema = createInsertSchema(cryptoAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  triggeredAt: true,
});

export const insertCryptoPortfolioSchema = createInsertSchema(cryptoPortfolio).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateExpenseSchema = insertExpenseSchema.partial();
export const updateTagSchema = insertTagSchema.partial();
export const updatePaymentMethodSchema = insertPaymentMethodSchema.partial();
export const updateAccountSchema = insertAccountSchema.partial();
export const updateExchangeRateSchema = insertExchangeRateSchema.partial();
export const updateSettingsFinanceSchema = insertSettingsFinanceSchema.partial();
export const updateTelegramSettingsSchema = insertTelegramSettingsSchema.partial();

// Investment Management Update Schemas
export const updateInvProjectSchema = insertInvProjectSchema.partial();
export const updateInvTxSchema = insertInvTxSchema.partial();

// Subscription Management Update Schemas
export const updateSubscriptionSchema = insertSubscriptionSchema.partial();

// Work Reports Update Schemas
export const updateWorkReportSchema = insertWorkReportSchema.partial();

// Crypto Management Update Schemas
export const updateCryptoApiSettingsSchema = insertCryptoApiSettingsSchema.partial();
export const updateCryptoAlertSchema = insertCryptoAlertSchema.partial();
export const updateCryptoPortfolioSchema = insertCryptoPortfolioSchema.partial();

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
export type UpdateTag = z.infer<typeof updateTagSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type UpdatePaymentMethod = z.infer<typeof updatePaymentMethodSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type UpdateExpense = z.infer<typeof updateExpenseSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

// Fund Management Types
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;
export type UpdateAccount = z.infer<typeof updateAccountSchema>;
export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type Ledger = typeof ledger.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfers.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type UpdateExchangeRate = z.infer<typeof updateExchangeRateSchema>;
export type InsertSettingsFinance = z.infer<typeof insertSettingsFinanceSchema>;
export type SettingsFinance = typeof settingsFinance.$inferSelect;
export type UpdateSettingsFinance = z.infer<typeof updateSettingsFinanceSchema>;
export type InsertTelegramSettings = z.infer<typeof insertTelegramSettingsSchema>;
export type TelegramSettings = typeof telegramSettings.$inferSelect;
export type UpdateTelegramSettings = z.infer<typeof updateTelegramSettingsSchema>;

// Investment Management Types
export type InsertInvProject = z.infer<typeof insertInvProjectSchema>;
export type InvProject = typeof invProjects.$inferSelect;
export type UpdateInvProject = z.infer<typeof updateInvProjectSchema>;
export type InsertInvCategory = z.infer<typeof insertInvCategorySchema>;
export type InvCategory = typeof invCategories.$inferSelect;
export type InsertInvTx = z.infer<typeof insertInvTxSchema>;
export type InvTx = typeof invTx.$inferSelect;
export type UpdateInvTx = z.infer<typeof updateInvTxSchema>;
export type InsertInvPayout = z.infer<typeof insertInvPayoutSchema>;
export type InvPayout = typeof invPayouts.$inferSelect;

// Subscription Management Types
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;

// Work Reports Types
export type InsertWorkReport = z.infer<typeof insertWorkReportSchema>;
export type WorkReport = typeof workReports.$inferSelect;
export type UpdateWorkReport = z.infer<typeof updateWorkReportSchema>;

// Crypto Management Types
export type InsertCryptoApiSettings = z.infer<typeof insertCryptoApiSettingsSchema>;
export type CryptoApiSettings = typeof cryptoApiSettings.$inferSelect;
export type UpdateCryptoApiSettings = z.infer<typeof updateCryptoApiSettingsSchema>;
export type InsertCryptoWatchlist = z.infer<typeof insertCryptoWatchlistSchema>;
export type CryptoWatchlist = typeof cryptoWatchlist.$inferSelect;
export type InsertCryptoAlert = z.infer<typeof insertCryptoAlertSchema>;
export type CryptoAlert = typeof cryptoAlerts.$inferSelect;
export type UpdateCryptoAlert = z.infer<typeof updateCryptoAlertSchema>;
export type InsertCryptoPortfolio = z.infer<typeof insertCryptoPortfolioSchema>;
export type CryptoPortfolio = typeof cryptoPortfolio.$inferSelect;
export type UpdateCryptoPortfolio = z.infer<typeof updateCryptoPortfolioSchema>;
