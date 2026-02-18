import { Router, Request, Response } from "express";
import crypto from "crypto";
import { timeEntryService } from "../services/timeEntryService";
import { timeCategoryService } from "../services/timeCategoryService";
import { timeStatsService } from "../services/timeStatsService";
import prisma from "../config/database";
import { env } from "../config/env";
import logger from "../config/logger";
import { sendError } from "../utils/response";
import { getStartOfWeek } from "../utils/dateUtils";

const router = Router();

/**
 * Slack 簽名驗證
 */
function verifySlackSignature(req: Request): boolean {
  const slackSigningSecret = env.SLACK_SIGNING_SECRET;
  if (!slackSigningSecret) {
    logger.warn("SLACK_SIGNING_SECRET not configured");
    return false;
  }

  const timestamp = req.headers["x-slack-request-timestamp"] as string;
  const signature = req.headers["x-slack-signature"] as string;

  if (!timestamp || !signature) return false;

  // 防止 replay 攻擊（5 分鐘內有效）
  const time = Math.floor(Date.now() / 1000);
  if (Math.abs(time - parseInt(timestamp)) > 60 * 5) {
    return false;
  }

  // NOTE: Slack 官方建議使用原始 request body 計算簽章，
  // 但 express.json() 已解析 body。JSON.stringify 在大多數情況下能正確還原，
  // 但鍵序/格式可能與原始 body 不同。若遇到驗證失敗，需改用 express.raw() 保留原始 body。
  const sigBasestring = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", slackSigningSecret)
      .update(sigBasestring)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature),
  );
}

/**
 * 根據 Slack User ID 取得員工
 */
async function getEmployeeBySlackId(slackUserId: string) {
  return prisma.employee.findUnique({
    where: { slackUserId },
  });
}

/**
 * POST /api/slack/commands/time
 * 處理 /time 斜線指令
 *
 * 注意：Slack 指令回應使用 Slack 專屬格式（response_type, blocks），
 * 非標準 API 回應格式
 */
router.post(
  "/commands/time",
  async (req: Request, res: Response): Promise<void> => {
    try {
      // 驗證 Slack 簽名
      if (!verifySlackSignature(req)) {
        if (env.NODE_ENV === "development" && !env.SLACK_SIGNING_SECRET) {
          logger.warn(
            "Skipping Slack signature verification in dev mode (no signing secret)",
          );
        } else {
          sendError(res, "INVALID_SIGNATURE", "Invalid signature", 401);
          return;
        }
      }

      const { user_id, text } = req.body;

      // 取得員工資訊
      const employee = await getEmployeeBySlackId(user_id);
      if (!employee) {
        res.json({
          response_type: "ephemeral",
          text: "找不到您的帳號，請先完成註冊。",
        });
        return;
      }

      // 解析指令
      const command = text?.trim().toLowerCase() || "";

      if (command === "" || command === "help") {
        // 顯示使用說明
        res.json({
          response_type: "ephemeral",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*工時追蹤指令*",
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text:
                  "`/time` - 顯示此說明\n" +
                  "`/time log` - 開啟工時登記對話框\n" +
                  "`/time today` - 查看今日工時\n" +
                  "`/time week` - 查看本週工時\n" +
                  "`/time summary` - 查看工時摘要",
              },
            },
          ],
        });
      } else if (command === "today") {
        // 顯示今日工時
        const summary = await timeEntryService.getTodaySummary(employee.id);
        const entries = summary.entries
          .map(
            (e) =>
              `${e.project.name}${e.task ? ` / ${e.task.name}` : ""}: ${e.hours}h`,
          )
          .join("\n");

        res.json({
          response_type: "ephemeral",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text:
                  `*今日工時摘要*\n\n` +
                  `總時數: *${summary.totalHours} 小時*\n\n` +
                  (entries || "_尚無工時記錄_"),
              },
            },
          ],
        });
      } else if (command === "week") {
        // 顯示本週工時
        const weekStart = getStartOfWeek();

        const timesheet = await timeEntryService.getWeeklyTimesheet(
          employee.id,
          weekStart,
        );

        const entries = timesheet.entries
          .map(
            (e) =>
              `${e.projectName}${e.taskName ? ` / ${e.taskName}` : ""}: ${e.totalHours}h`,
          )
          .join("\n");

        res.json({
          response_type: "ephemeral",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text:
                  `*本週工時摘要*\n\n` +
                  `週期: ${timesheet.weekStart.toLocaleDateString()} - ${timesheet.weekEnd.toLocaleDateString()}\n` +
                  `總時數: *${timesheet.weeklyTotal} 小時*\n\n` +
                  (entries || "_尚無工時記錄_"),
              },
            },
          ],
        });
      } else if (command === "summary") {
        // 顯示工時統計
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const stats = await timeStatsService.getEmployeeStats(employee.id, {
          startDate: monthStart,
          endDate: monthEnd,
        });

        const topProjects = stats.projectBreakdown
          .slice(0, 3)
          .map((p) => `${p.projectName}: ${p.hours}h (${p.percentage}%)`)
          .join("\n");

        res.json({
          response_type: "ephemeral",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text:
                  `*本月工時統計*\n\n` +
                  `總時數: *${stats.totalHours} 小時*\n` +
                  `已核准: ${stats.approvedHours}h | 待審核: ${stats.pendingHours}h\n\n` +
                  `*專案分佈:*\n${topProjects || "_尚無資料_"}`,
              },
            },
          ],
        });
      } else if (command === "log") {
        // 開啟工時登記對話框
        // 取得可用的專案和類別
        const projects = await prisma.project.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });

        const categories = await timeCategoryService.getCategories();

        res.json({
          response_type: "ephemeral",
          text: "請使用網頁介面登記工時，或直接呼叫 API。",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text:
                  "*工時登記*\n\n" +
                  "請使用以下方式之一登記工時:\n" +
                  "網頁介面\n" +
                  "直接呼叫 API: `POST /api/time-entries`\n\n" +
                  `可用專案: ${projects.map((p) => p.name).join(", ")}\n` +
                  `可用類別: ${categories.map((c) => c.name).join(", ")}`,
              },
            },
          ],
        });
      } else {
        res.json({
          response_type: "ephemeral",
          text: `未知指令\n輸入 \`/time help\` 查看可用指令`,
        });
      }
    } catch (error) {
      logger.error("Slack time command error:", error);
      res.json({
        response_type: "ephemeral",
        text: "處理指令時發生錯誤，請稍後再試。",
      });
    }
  },
);

/**
 * POST /api/slack/interactions
 * 處理 Slack 互動事件（按鈕點擊、對話框提交等）
 */
router.post(
  "/interactions",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!verifySlackSignature(req)) {
        if (env.NODE_ENV === "development" && !env.SLACK_SIGNING_SECRET) {
          logger.warn(
            "Skipping Slack signature verification in dev mode (no signing secret)",
          );
        } else {
          sendError(res, "INVALID_SIGNATURE", "Invalid signature", 401);
          return;
        }
      }

      // 安全地解析 Slack 互動事件的 payload
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(req.body.payload || "{}");
      } catch {
        sendError(res, "INVALID_PAYLOAD", "Invalid JSON payload", 400);
        return;
      }
      const type = payload.type as string | undefined;
      const user = payload.user as { id: string } | undefined;

      if (type === "view_submission") {
        // 處理對話框提交
        const employee = user?.id ? await getEmployeeBySlackId(user.id) : null;
        if (!employee) {
          res.json({
            response_action: "errors",
            errors: { project: "找不到您的帳號" },
          });
          return;
        }

        res.json({ response_action: "clear" });
      } else if (type === "block_actions") {
        res.json({});
      } else {
        res.json({});
      }
    } catch (error) {
      logger.error("Slack interaction error:", error);
      sendError(res, "SLACK_INTERACTION_FAILED", "Internal error", 500);
    }
  },
);

export default router;
