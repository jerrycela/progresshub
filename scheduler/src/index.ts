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
 * Issue #13 修復：使用分頁查詢優化效能
 */
async function checkUnreportedEmployees(): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Checking unreported employees...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const BATCH_SIZE = 100;
    let cursor: string | undefined;
    let processedCount = 0;
    let reminderCount = 0;

    while (true) {
      // Issue #13: 使用分頁查詢，只取有進行中任務的員工
      const employees = await prisma.employee.findMany({
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          assignedTasks: {
            some: { status: 'IN_PROGRESS' },
          },
        },
        include: {
          progressLogs: {
            where: { reportedAt: { gte: today } },
            take: 1,
          },
        },
      });

      if (employees.length === 0) break;

      for (const employee of employees) {
        // 如果今天沒有回報，發送提醒
        if (employee.progressLogs.length === 0) {
          await sendReminder(employee.slackUserId, employee.name);
          reminderCount++;
        }
        processedCount++;
      }

      cursor = employees[employees.length - 1].id;

      // 如果取得的數量少於 BATCH_SIZE，表示已經是最後一批
      if (employees.length < BATCH_SIZE) break;
    }

    console.log(`[${new Date().toISOString()}] Reminder check completed. Processed: ${processedCount}, Reminders sent: ${reminderCount}`);
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
 * Validate Slack token on startup
 * Issue #11 修復：Slack Token 啟動時驗證
 */
async function validateSlackToken(): Promise<boolean> {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.warn('⚠️ SLACK_BOT_TOKEN not configured');
    return false;
  }

  try {
    const result = await slackClient.auth.test();
    console.log(`✅ Slack connected as: ${result.user} (Team: ${result.team})`);
    return true;
  } catch (error) {
    console.error('❌ Invalid Slack token:', error);
    return false;
  }
}

/**
 * Start scheduler
 */
async function startScheduler(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Issue #11: 驗證 Slack Token
    const isSlackValid = await validateSlackToken();
    if (!isSlackValid && process.env.NODE_ENV === 'production') {
      throw new Error('Slack token validation failed in production environment');
    }

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
