import crypto from 'crypto';

/**
 * 驗證 GitLab Webhook 簽章
 * GitLab 使用 X-Gitlab-Token header 進行驗證
 */
export function verifyWebhookSignature(
  token: string | undefined,
  webhookSecret: string
): boolean {
  if (!token || !webhookSecret) {
    return false;
  }

  // GitLab 直接比較 token 值
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(webhookSecret)
  );
}

/**
 * 生成 Webhook Secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 解析 GitLab Webhook 事件類型
 */
export function parseEventType(
  objectKind: string,
  action?: string
): string {
  switch (objectKind) {
    case 'push':
      return 'push';
    case 'merge_request':
      return action ? `merge_request_${action}` : 'merge_request';
    case 'issue':
      return action ? `issue_${action}` : 'issue';
    case 'note':
      return 'comment';
    default:
      return objectKind;
  }
}
