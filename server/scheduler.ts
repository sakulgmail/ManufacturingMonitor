import cron from 'node-cron';
import { storage } from './storage';

class MachineStatusScheduler {
  private resetTask: cron.ScheduledTask | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing machine status scheduler...');
    
    // Check if reset feature is enabled and get the schedule
    await this.updateSchedule();
    
    this.isInitialized = true;
    console.log('Machine status scheduler initialized');
  }

  async updateSchedule() {
    try {
      // Get the reset time setting from database
      const resetTimeSetting = await storage.getSystemSetting('machine_reset_time');
      
      if (!resetTimeSetting || !resetTimeSetting.enabled) {
        // If disabled or not set, stop any existing schedule
        if (this.resetTask) {
          this.resetTask.stop();
          this.resetTask = null;
          console.log('Machine status reset schedule disabled');
        }
        return;
      }

      // Parse the time (expected format: "HH:MM")
      const timeValue = resetTimeSetting.value;
      const [hours, minutes] = timeValue.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('Invalid time format for machine reset:', timeValue);
        return;
      }

      // Create cron expression: "0 MINUTES HOURS * * *" (every day at specified time)
      const cronExpression = `0 ${minutes} ${hours} * * *`;
      
      // Stop existing task if running
      if (this.resetTask) {
        this.resetTask.stop();
      }

      // Create new scheduled task
      this.resetTask = cron.schedule(cronExpression, async () => {
        try {
          console.log(`Running scheduled machine status reset at ${timeValue}`);
          await storage.resetAllMachineStatus();
          console.log('All machine statuses reset to "To Check"');
        } catch (error) {
          console.error('Error during scheduled machine status reset:', error);
        }
      }, {
        scheduled: true,
        timezone: 'America/New_York' // You can make this configurable too
      });

      console.log(`Machine status reset scheduled for ${timeValue} daily`);
      
    } catch (error) {
      console.error('Error updating machine status schedule:', error);
    }
  }

  async stop() {
    if (this.resetTask) {
      this.resetTask.stop();
      this.resetTask = null;
      console.log('Machine status scheduler stopped');
    }
  }
}

// Export singleton instance
export const machineStatusScheduler = new MachineStatusScheduler();