import cron from "node-cron";
import { WebClient } from "@slack/web-api";
import prisma from "../config/database";
import { env } from "../config/env";
import logger from "../config/logger";

let slackClient: WebClient | null = null;

function getSlackClient(): WebClient | null {
  if (!env.SLACK_BOT_TOKEN) return null;
  if (!slackClient) {
    slackClient = new WebClient(env.SLACK_BOT_TOKEN);
  }
  return slackClient;
}

const REMINDER_TIME = process.env.REMINDER_TIME || "17:00";
const REMINDER_TIMEZONE = process.env.REMINDER_TIMEZONE || "Asia/Taipei";

/**
 * Check which employees haven't reported progress today
 */
async function checkUnreportedEmployees(): Promise<void> {
  try {
    logger.info(
      `[Scheduler] ${new Date().toISOString()} - Checking unreported employees...`,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all employees with active tasks
    const employees = await prisma.employee.findMany({
      where: {
        assignedTasks: {
          some: { status: "IN_PROGRESS" },
        },
      },
      include: {
        assignedTasks: {
          where: { status: "IN_PROGRESS" },
        },
      },
    });

    for (const employee of employees) {
      // Check if employee has reported today
      const todayReport = await prisma.progressLog.findFirst({
        where: {
          employeeId: employee.id,
          reportedAt: { gte: today },
        },
      });

      // If no report today, send reminder
      if (!todayReport) {
        if (employee.slackUserId) {
          await sendReminder(employee.slackUserId, employee.name);
        }
      }
    }

    logger.info(
      `[Scheduler] ${new Date().toISOString()} - Reminder check completed`,
    );
  } catch (error) {
    logger.error("[Scheduler] Error checking unreported employees:", error);
  }
}

/**
 * Send reminder message to employee via Slack
 */
async function sendReminder(
  slackUserId: string,
  employeeName: string,
): Promise<void> {
  try {
    const client = getSlackClient();
    if (!client) {
      logger.warn(
        "[Scheduler] SLACK_BOT_TOKEN not configured, skipping reminder",
      );
      return;
    }

    await client.chat.postMessage({
      channel: slackUserId,
      text: `嗨 ${employeeName}! 👋\n今天還沒看到你的進度回報喔~\n請用 \`/report\` 指令回報你的工作進度`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `嗨 ${employeeName}! 👋`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "今天還沒看到你的進度回報喔~\n請用 `/report` 指令回報你的工作進度",
          },
        },
      ],
    });

    logger.info(
      `[Scheduler] Reminder sent to ${employeeName} (${slackUserId})`,
    );
  } catch (error) {
    logger.error(
      `[Scheduler] Error sending reminder to ${employeeName}:`,
      error,
    );
  }
}

/**
 * Parse time string to cron format
 */
function timeToCron(time: string): string {
  const [hours, minutes] = time.split(":");
  return `${minutes} ${hours} * * 1-5`; // Monday to Friday
}

/**
 * Initialize and start the scheduler
 */
export function startScheduler(): void {
  const cronExpression = timeToCron(REMINDER_TIME);

  logger.info(
    `[Scheduler] Configured for: ${REMINDER_TIME} (${REMINDER_TIMEZONE})`,
  );
  logger.info(`[Scheduler] Cron expression: ${cronExpression}`);

  cron.schedule(
    cronExpression,
    async () => {
      logger.info(
        `[Scheduler] Running daily reminder check at ${new Date().toISOString()}`,
      );
      await checkUnreportedEmployees();
    },
    {
      timezone: REMINDER_TIMEZONE,
    },
  );

  logger.info("[Scheduler] Scheduler started successfully");

  // Run immediately on startup in development mode (for testing)
  if (env.NODE_ENV === "development") {
    logger.info("[Scheduler] Running initial check (development mode)...");
    checkUnreportedEmployees();
  }
}
