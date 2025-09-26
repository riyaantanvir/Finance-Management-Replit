import { telegramService } from './telegram';

class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastReportDate = '';

  start(): void {
    if (this.isRunning) {
      console.log('Scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting subscription alert scheduler...');
    
    // Check every 5 minutes for alerts and daily reports
    // More frequent checking ensures we don't miss the target times
    this.intervalId = setInterval(async () => {
      await this.checkForAlerts();
      await this.checkForDailyReports();
    }, 5 * 60 * 1000); // 5 minutes

    // Run initial check
    this.checkForAlerts();
    this.checkForDailyReports();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Scheduler stopped');
  }

  private async checkForAlerts(): Promise<void> {
    const now = new Date();
    const dhakaTz = 'Asia/Dhaka';
    
    // Convert current time to Dhaka timezone
    const dhakaTime = new Intl.DateTimeFormat('en-US', {
      timeZone: dhakaTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    // Check if it's 09:00 in Dhaka timezone (±1 hour window for reliability)
    const [hours, minutes] = dhakaTime.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    const targetMinutes = 9 * 60; // 09:00 = 540 minutes
    
    // Allow 1-hour window (540-600 minutes = 9:00-10:00 AM Dhaka time)
    if (currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 60) {
      console.log(`Running subscription alerts check at ${dhakaTime} Dhaka time`);
      await telegramService.checkSubscriptionAlerts();
    }
  }

  private async checkForDailyReports(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Only check once per day to avoid duplicate reports
      if (this.lastReportDate === today) {
        return;
      }
      
      // Let the telegram service handle the time checking and report generation
      const reportSent = await telegramService.checkDailyReport();
      
      // If report was sent, update the last report date
      if (reportSent) {
        this.lastReportDate = today;
        console.log(`Daily report sent successfully for ${today}`);
      }
    } catch (error) {
      console.error('Error checking for daily reports:', error);
    }
  }

  // Manual trigger for testing
  async triggerAlerts(): Promise<void> {
    console.log('Manually triggering subscription alerts...');
    await telegramService.checkSubscriptionAlerts();
  }
}

export const scheduler = new Scheduler();