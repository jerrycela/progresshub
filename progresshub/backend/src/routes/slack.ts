import { Router, Request, Response } from 'express';
import { PrismaClient, TaskStatus } from '@prisma/client';
import { WebClient } from '@slack/web-api';
import crypto from 'crypto';
import { HttpError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Verify Slack request signature
const verifySlackRequest = (req: Request): boolean => {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  const timestamp = req.headers['x-slack-request-timestamp'] as string;
  const slackSignature = req.headers['x-slack-signature'] as string;

  if (!timestamp || !slackSignature) return false;

  // Check timestamp to prevent replay attacks
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) return false;

  const sigBasestring = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const mySignature =
    'v0=' +
    crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature));
};

// Handle Slack slash commands
router.post('/commands', async (req: Request, res: Response, next) => {
  try {
    const { command, trigger_id, user_id, user_name } = req.body;

    if (command === '/report' || command === '/進度回報') {
      // Find employee by Slack user ID
      const employee = await prisma.employee.findUnique({
        where: { slackUserId: user_id },
      });

      if (!employee) {
        return res.json({
          response_type: 'ephemeral',
          text: '您尚未註冊 ProgressHub。請先登入系統完成註冊。',
        });
      }

      // Get employee's assigned tasks
      const tasks = await prisma.task.findMany({
        where: {
          assignedToId: employee.id,
          status: { not: TaskStatus.COMPLETED },
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { plannedEndDate: 'asc' },
      });

      if (tasks.length === 0) {
        return res.json({
          response_type: 'ephemeral',
          text: '您目前沒有未完成的任務需要回報。',
        });
      }

      // Build project options (unique projects)
      const projectMap = new Map();
      tasks.forEach((t) => {
        if (!projectMap.has(t.projectId)) {
          projectMap.set(t.projectId, t.project.name);
        }
      });

      const projectOptions = Array.from(projectMap.entries()).map(([id, name]) => ({
        text: { type: 'plain_text', text: name as string },
        value: id,
      }));

      // Open modal
      await slack.views.open({
        trigger_id,
        view: {
          type: 'modal',
          callback_id: 'progress_report_modal',
          title: { type: 'plain_text', text: '進度回報' },
          submit: { type: 'plain_text', text: '提交' },
          close: { type: 'plain_text', text: '取消' },
          private_metadata: JSON.stringify({ employeeId: employee.id }),
          blocks: [
            {
              type: 'input',
              block_id: 'project_block',
              label: { type: 'plain_text', text: '專案' },
              element: {
                type: 'static_select',
                action_id: 'project_select',
                placeholder: { type: 'plain_text', text: '選擇專案' },
                options: projectOptions,
              },
            },
            {
              type: 'input',
              block_id: 'task_block',
              label: { type: 'plain_text', text: '任務' },
              element: {
                type: 'static_select',
                action_id: 'task_select',
                placeholder: { type: 'plain_text', text: '選擇任務' },
                options: tasks.slice(0, 100).map((t) => ({
                  text: { type: 'plain_text', text: `${t.project.name} - ${t.name}` },
                  value: t.id,
                })),
              },
            },
            {
              type: 'input',
              block_id: 'progress_block',
              label: { type: 'plain_text', text: '今日進度 (%)' },
              element: {
                type: 'plain_text_input',
                action_id: 'progress_input',
                placeholder: { type: 'plain_text', text: '0-100' },
              },
            },
            {
              type: 'input',
              block_id: 'notes_block',
              label: { type: 'plain_text', text: '備註' },
              optional: true,
              element: {
                type: 'plain_text_input',
                action_id: 'notes_input',
                multiline: true,
                placeholder: { type: 'plain_text', text: '補充說明（選填）' },
              },
            },
          ],
        },
      });

      res.status(200).send();
    } else {
      res.json({
        response_type: 'ephemeral',
        text: `未知的指令: ${command}`,
      });
    }
  } catch (error) {
    console.error('Slack command error:', error);
    next(error);
  }
});

// Handle Slack interactions (modal submissions)
router.post('/interactions', async (req: Request, res: Response, next) => {
  try {
    const payload = JSON.parse(req.body.payload);

    if (payload.type === 'view_submission' && payload.view.callback_id === 'progress_report_modal') {
      const { employeeId } = JSON.parse(payload.view.private_metadata);
      const values = payload.view.state.values;

      const taskId = values.task_block.task_select.selected_option.value;
      const progressStr = values.progress_block.progress_input.value;
      const notes = values.notes_block?.notes_input?.value || null;

      const progressPercentage = parseInt(progressStr, 10);

      if (isNaN(progressPercentage) || progressPercentage < 0 || progressPercentage > 100) {
        return res.json({
          response_action: 'errors',
          errors: {
            progress_block: '請輸入 0-100 之間的數字',
          },
        });
      }

      // Get task for validation
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.json({
          response_action: 'errors',
          errors: {
            task_block: '任務不存在',
          },
        });
      }

      // Create progress log
      await prisma.progressLog.create({
        data: {
          taskId,
          employeeId,
          progressPercentage,
          notes,
        },
      });

      // Update task
      let newStatus: TaskStatus = task.status;
      if (progressPercentage === 100) {
        newStatus = TaskStatus.COMPLETED;
      } else if (progressPercentage > 0 && task.status === TaskStatus.NOT_STARTED) {
        newStatus = TaskStatus.IN_PROGRESS;
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          progressPercentage,
          status: newStatus,
          ...(progressPercentage > 0 && !task.actualStartDate && {
            actualStartDate: new Date(),
          }),
          ...(progressPercentage === 100 && {
            actualEndDate: new Date(),
          }),
        },
      });

      // Send confirmation message
      await slack.chat.postMessage({
        channel: payload.user.id,
        text: `進度回報成功！\n任務: ${task.name}\n進度: ${progressPercentage}%${notes ? `\n備註: ${notes}` : ''}`,
      });

      res.status(200).send();
    } else {
      res.status(200).send();
    }
  } catch (error) {
    console.error('Slack interaction error:', error);
    next(error);
  }
});

export default router;
