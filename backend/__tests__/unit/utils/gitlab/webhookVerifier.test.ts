import {
  verifyWebhookSignature,
  generateWebhookSecret,
  parseEventType,
} from '../../../../src/utils/gitlab/webhookVerifier';

describe('GitLab Webhook Verifier', () => {
  describe('verifyWebhookSignature', () => {
    it('token 與 secret 相符時應回傳 true', () => {
      const secret = 'my-webhook-secret';

      expect(verifyWebhookSignature(secret, secret)).toBe(true);
    });

    it('token 與 secret 長度相同但內容不同時應回傳 false', () => {
      // timingSafeEqual 要求相同長度的 buffer
      expect(verifyWebhookSignature('abcdefgh', 'abcdefgi')).toBe(false);
    });

    it('token 為 undefined 時應回傳 false', () => {
      expect(verifyWebhookSignature(undefined, 'secret')).toBe(false);
    });

    it('token 為空字串時應回傳 false', () => {
      expect(verifyWebhookSignature('', 'secret')).toBe(false);
    });

    it('webhookSecret 為空字串時應回傳 false', () => {
      expect(verifyWebhookSignature('token', '')).toBe(false);
    });

    it('長度不同的 token 和 secret 不應拋出錯誤（已改為 hash 後固定長度比較）', () => {
      // P2-S3 修復：先 SHA-256 hash 再 timingSafeEqual，不再因長度不同而拋錯
      expect(() => verifyWebhookSignature('short', 'much-longer-secret')).not.toThrow();
      expect(verifyWebhookSignature('short', 'much-longer-secret')).toBe(false);
    });
  });

  describe('generateWebhookSecret', () => {
    it('應生成非空字串', () => {
      const secret = generateWebhookSecret();

      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });

    it('應生成 64 字元的 hex 字串（32 bytes）', () => {
      const secret = generateWebhookSecret();

      expect(secret.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
    });

    it('每次生成的 secret 應不同', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('parseEventType', () => {
    it('push 事件應回傳 "push"', () => {
      expect(parseEventType('push')).toBe('push');
    });

    it('merge_request 事件應帶上 action', () => {
      expect(parseEventType('merge_request', 'open')).toBe('merge_request_open');
      expect(parseEventType('merge_request', 'merge')).toBe('merge_request_merge');
      expect(parseEventType('merge_request', 'close')).toBe('merge_request_close');
    });

    it('merge_request 無 action 時應回傳 "merge_request"', () => {
      expect(parseEventType('merge_request')).toBe('merge_request');
    });

    it('issue 事件應帶上 action', () => {
      expect(parseEventType('issue', 'open')).toBe('issue_open');
      expect(parseEventType('issue', 'close')).toBe('issue_close');
    });

    it('issue 無 action 時應回傳 "issue"', () => {
      expect(parseEventType('issue')).toBe('issue');
    });

    it('note 事件應回傳 "comment"', () => {
      expect(parseEventType('note')).toBe('comment');
    });

    it('未知事件類型應原樣回傳', () => {
      expect(parseEventType('pipeline')).toBe('pipeline');
      expect(parseEventType('tag_push')).toBe('tag_push');
    });
  });
});
