import { storage } from './storage';
import { TelegramSettings } from '@shared/schema';

export class TelegramService {
  private botToken: string;
  private chatId: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    
    if (!this.botToken || !this.chatId) {
      console.warn('Telegram credentials not configured. Alerts will be disabled.');
    }
  }

  // Get current telegram settings from database
  private async getTelegramSettings(): Promise<TelegramSettings | null> {
    try {
      const settings = await storage.getTelegramSettings();
      return settings || null;
    } catch (error) {
      console.error('Failed to get telegram settings:', error);
      return null;
    }
  }

  async sendMessage(text: string): Promise<boolean> {
    // Try to get settings from database first, fallback to env vars
    const settings = await this.getTelegramSettings();
    const botToken = settings?.botToken || this.botToken;
    const chatId = settings?.chatId || this.chatId;

    if (!botToken || !chatId) {
      console.warn('Telegram not configured, skipping message:', text);
      return false;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram API error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      return false;
    }
  }

  async sendSubscriptionAlert(subscriptionName: string, amount: string, currency: string, nextBillDate: string, cardLast4?: string): Promise<boolean> {
    const cardInfo = cardLast4 ? ` (Card ending in ${cardLast4})` : '';
    const message = `🔔 *Subscription Payment Due*\n\n` +
      `📱 *Service:* ${subscriptionName}\n` +
      `💰 *Amount:* ${amount} ${currency}\n` +
      `📅 *Due Date:* ${nextBillDate}${cardInfo}\n\n` +
      `Don't forget to ensure you have sufficient funds!`;

    return this.sendMessage(message);
  }

  async sendWorkReportNotification(username: string, taskDetails: string, hours: string, date: string): Promise<boolean> {
    // Check if work report notifications are enabled in settings
    const settings = await this.getTelegramSettings();
    if (!settings?.workReportNotification) {
      return false; // Notifications disabled
    }

    const message = `📋 *New Work Report Submitted*\n\n` +
      `👤 *User:* ${username}\n` +
      `📅 *Date:* ${date}\n` +
      `⏰ *Hours:* ${hours}h\n` +
      `📝 *Task:* ${taskDetails}\n\n` +
      `A new work report has been submitted for review.`;

    return this.sendMessage(message);
  }

  async checkSubscriptionAlerts(): Promise<void> {
    try {
      // Get subscriptions due in 2 days for alerts
      const subscriptionsDue = await storage.getSubscriptionsDueForAlert(2);
      
      for (const subscription of subscriptionsDue) {
        await this.sendSubscriptionAlert(
          subscription.name,
          subscription.amount,
          subscription.currency,
          subscription.nextBillDate,
          subscription.cardLast4 || undefined
        );
      }

      if (subscriptionsDue.length > 0) {
        console.log(`Sent ${subscriptionsDue.length} subscription alerts via Telegram`);
      }
    } catch (error) {
      console.error('Failed to check subscription alerts:', error);
    }
  }

  // Generate and send daily report
  async sendDailyReport(): Promise<boolean> {
    try {
      const expenses = await storage.getFilteredExpenses({
        dateRange: 'today'
      });

      if (expenses.length === 0) {
        const message = '📊 *Daily Report*\n\nNo transactions recorded today.';
        return await this.sendMessage(message);
      }

      // Calculate totals
      let totalIncome = 0;
      let totalExpenses = 0;
      const transactionsList: string[] = [];

      expenses.forEach(expense => {
        const amount = parseFloat(expense.amount);
        if (expense.type === 'income') {
          totalIncome += amount;
          transactionsList.push(`+ ${expense.details}: ৳${expense.amount}`);
        } else if (expense.type === 'expense') {
          totalExpenses += amount;
          transactionsList.push(`- ${expense.details}: ৳${expense.amount}`);
        }
      });

      const netBalance = totalIncome - totalExpenses;
      const transactionCount = expenses.length;

      // Build message with character limit handling
      let message = `📊 *Daily Report*\n\n` +
        `💰 *Total Income:* ৳${totalIncome.toFixed(2)}\n` +
        `💸 *Total Expenses:* ৳${totalExpenses.toFixed(2)}\n` +
        `📈 *Net Balance:* ৳${netBalance.toFixed(2)}\n` +
        `📋 *Today's Transactions:* ${transactionCount} Transaction(s)\n\n`;

      if (transactionsList.length > 0) {
        let transactionDetails = '*Transaction Details:*\n';
        let remainingChars = 4000 - message.length - transactionDetails.length; // Leave buffer for Telegram limit
        
        const truncatedTransactions = [];
        for (const transaction of transactionsList) {
          if (remainingChars - transaction.length - 1 > 0) { // -1 for newline
            truncatedTransactions.push(transaction);
            remainingChars -= transaction.length + 1;
          } else {
            break;
          }
        }
        
        message += transactionDetails + truncatedTransactions.join('\n');
        
        // Add note if transactions were truncated
        if (truncatedTransactions.length < transactionsList.length) {
          message += `\n\n_... and ${transactionsList.length - truncatedTransactions.length} more transactions_`;
        }
      }

      return await this.sendMessage(message);
    } catch (error) {
      console.error('Failed to send daily report:', error);
      return false;
    }
  }

  // Check if it's time to send daily report
  async checkDailyReport(): Promise<boolean> {
    try {
      const settings = await this.getTelegramSettings();
      if (!settings || !settings.botToken || !settings.chatId) {
        console.log('Telegram not configured, skipping daily report');
        return false;
      }

      const now = new Date();
      const dhakaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      const currentHour = dhakaNow.getHours();
      const currentMinute = dhakaNow.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      const reportTime = settings.reportTime || '21:00';
      const [reportHour, reportMinuteStr] = reportTime.split(':');
      const reportTotalMinutes = parseInt(reportHour) * 60 + parseInt(reportMinuteStr);

      // Check if we're within 5 minutes after the target time (to handle scheduler intervals)
      if (currentTotalMinutes >= reportTotalMinutes && currentTotalMinutes < reportTotalMinutes + 5) {
        console.log(`Sending daily report at ${currentHour}:${currentMinute.toString().padStart(2, '0')} (target: ${reportTime})`);
        const success = await this.sendDailyReport();
        if (success) {
          console.log('Daily report sent successfully');
          return true;
        } else {
          console.error('Failed to send daily report');
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check daily report:', error);
      return false;
    }
  }
}

export const telegramService = new TelegramService();