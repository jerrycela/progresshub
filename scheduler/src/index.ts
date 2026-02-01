import cron from 'node-cron';
import { WebClient } from '@slack/web-api';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

const REMINDER_TIME = process.env.REMINDER_TIME || '17:00';
const REMINDER_TIMEZONE = process.env.REMINDER_TIMEZONE || 'Asia/Taipei';

/**
 * Check which employees haven't reported progress today
 */
async function checkUnreportedEmployees(): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Checking unreported employees...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all employees
    const employees = await prisma.employee.findMany({
      include: {
        assignedTasks: {
          where: {
            status: 'IN_PROGRESS',
          },
        },
      },
    });

    for (const employee of employees) {
      // Skip if employee has no active tasks
      if (employee.assignedTasks.length === 0) {
        continue;
      }

      // Check if employee has reported today
      const todayReport = await prisma.progressLog.findFirst({
        where: {
          employeeId: employee.id,
          reportedAt: {
            gte: today,
          },
        },
      });

      // If no report today, send reminder
      if (!todayReport) {
        await sendReminder(employee.slackUserId, employee.name);
      }
    }

    console.log(`[${new Date().toISOString()}] Reminder check completed`);
  } catch (error) {
    console.error('Error checking unreported employees:', error);
  }
}

/**
 * Send reminder message to employee via Slack
 */
async function sendReminder(slackUserId: string, employeeName: string): Promise<void> {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      console.warn('SLACK_BOT_TOKEN not configured, skipping reminder');
      return;
    }

    await slackClient.chat.postMessage({
      channel: slackUserId,
      text: `嗨 ${employeeName}! 👋\n今天還沒看到你的進度回報喔~\n請用 \`/report\` 指令回報你的工作進度`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `嗨 ${employeeName}! 👋`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '今天還沒看到你的進度回報喔~\n請用 `/report` 指令回報你的工作進度',
          },
        },
      ],
    });

    console.log(`✅ Reminder sent to ${employeeName} (${slackUserId})`);
  } catch (error) {
    console.error(`Error sending reminder to ${employeeName}:`, error);
  }
}

/**
 * Parse time string to cron format
 */
function timeToCron(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${minutes} ${hours} * * 1-5`; // Monday to Friday
}

/**
 * Start scheduler
 */
async function startScheduler(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    const cronExpression = timeToCron(REMINDER_TIME);
    console.log(`📅 Scheduler configured for: ${REMINDER_TIME} (${REMINDER_TIMEZONE})`);
    console.log(`📅 Cron expression: ${cronExpression}`);

    cron.schedule(
      cronExpression,
      async () => {
        console.log(`\n🔔 Running daily reminder check at ${new Date().toISOString()}`);
        await checkUnreportedEmployees();
      },
      {
        timezone: REMINDER_TIMEZONE,
      }
    );

    console.log('🚀 Scheduler started successfully');

    // Run immediately on startup (for testing)
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🧪 Running initial check (development mode)...');
      await checkUnreportedEmployees();
    }
  } catch (error) {
    console.error('❌ Failed to start scheduler:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startScheduler();
