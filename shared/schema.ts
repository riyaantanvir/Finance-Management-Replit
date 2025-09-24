import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  dashboardAccess: boolean("dashboard_access").default(true),
  expenseEntryAccess: boolean("expense_entry_access").default(true),
  adminPanelAccess: boolean("admin_panel_access").default(false),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateExpenseSchema = insertExpenseSchema.partial();

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type UpdateExpense = z.infer<typeof updateExpenseSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
