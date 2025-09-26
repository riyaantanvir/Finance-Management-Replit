import { storage } from './storage';

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

  async sendMessage(text: string): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      console.warn('Telegram not configured, skipping message:', text);
      return false;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
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
}

export const telegramService = new TelegramService();