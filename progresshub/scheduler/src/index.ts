import { PrismaClient, TaskStatus } from '@prisma/client';
import { WebClient } from '@slack/web-api';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// 提醒排程時間（預設週一至週五下午 5 點）
const REMINDER_CRON = process.env.REMINDER_CRON || '0 17 * * 1-5';

async function sendDailyReminders() {
  console.log(`[${new Date().toISOString()}] 開始執行每日提醒...`);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 取得所有活躍員工
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        assignedTasks: {
          where: {
            status: { not: TaskStatus.COMPLETED },
          },
        },
      },
    });

    // 檢查每個員工今日是否已回報
    for (const employee of employees) {
      // 如果沒有待完成任務，跳過
      if (employee.assignedTasks.length === 0) {
        continue;
      }

      // 檢查今日是否已回報
      const todayLogs = await prisma.progressLog.findMany({
        where: {
          employeeId: employee.id,
          reportedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      // 如果今日尚未回報，發送提醒
      if (todayLogs.length === 0) {
        try {
          await slack.chat.postMessage({
            channel: employee.slackUserId,
            text: `嗨 ${employee.name}！👋\n\n今天還沒看到你的進度回報喔～\n\n你有 ${employee.assignedTasks.length} 個任務待回報。\n\n請用 \`/report\` 指令回報你的工作進度！`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `嗨 *${employee.name}*！👋\n\n今天還沒看到你的進度回報喔～`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `你有 *${employee.assignedTasks.length}* 個任務待回報。`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '請用 `/report` 指令回報你的工作進度！',
                },
              },
            ],
          });

          console.log(`已發送提醒給 ${employee.name} (${employee.slackUserId})`);
        } catch (error) {
          console.error(`發送提醒給 ${employee.name} 失敗:`, error);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] 每日提醒執行完成`);
  } catch (error) {
    console.error('每日提醒執行失敗:', error);
  }
}

// 設定排程任務
console.log(`ProgressHub Scheduler 已啟動`);
console.log(`提醒排程: ${REMINDER_CRON}`);
console.log(`時區: ${process.env.TZ || 'UTC'}`);

cron.schedule(REMINDER_CRON, sendDailyReminders, {
  timezone: process.env.TZ || 'Asia/Taipei',
});

// 優雅關閉
process.on('SIGTERM', async () => {
  console.log('SIGTERM 收到，正在關閉...');
  await prisma.$disconnect();
  process.exit(0);
});

// 保持程序運行
console.log('排程服務運行中...');
