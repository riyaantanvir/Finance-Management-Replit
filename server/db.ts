import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users, tags, mainTags, subTags, paymentMethods, expenses, accounts, ledger, transfers, settingsFinance, exchangeRates, invProjects, invCategories, invTx, invPayouts, subscriptions, telegramSettings, workReports, cryptoApiSettings, cryptoWatchlist, cryptoAlerts, cryptoPortfolio } from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, {
  schema: { users, tags, mainTags, subTags, paymentMethods, expenses, accounts, ledger, transfers, settingsFinance, exchangeRates, invProjects, invCategories, invTx, invPayouts, subscriptions, telegramSettings, workReports, cryptoApiSettings, cryptoWatchlist, cryptoAlerts, cryptoPortfolio }
});