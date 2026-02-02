/**
 * 安全性工具函數
 * Security utility functions
 */

// Token 存儲鍵名
const TOKEN_KEY = 'auth_token';
const STATE_KEY = 'oauth_state';
const STATE_EXPIRY_KEY = 'oauth_state_expiry';

/**
 * 生成加密隨機字串（用於 OAuth state）
 */
export function generateSecureState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 儲存 OAuth state（5 分鐘有效期）
 */
export function saveOAuthState(state: string): void {
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(STATE_EXPIRY_KEY, expiry.toString());
}

/**
 * 驗證 OAuth state
 */
export function verifyOAuthState(state: string): boolean {
  const savedState = sessionStorage.getItem(STATE_KEY);
  const expiryStr = sessionStorage.getItem(STATE_EXPIRY_KEY);

  // 清除已使用的 state
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(STATE_EXPIRY_KEY);

  if (!savedState || !expiryStr) {
    return false;
  }

  const expiry = parseInt(expiryStr, 10);
  if (Date.now() > expiry) {
    return false; // State 已過期
  }

  // 使用時間常數比較防止 timing attack
  return timingSafeEqual(savedState, state);
}

/**
 * 時間常數字串比較（防止 timing attack）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 安全儲存 Token
 * 使用 sessionStorage 而非 localStorage（關閉瀏覽器後自動清除）
 */
export function saveToken(token: string): void {
  // 基本驗證 token 格式
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    console.error('Invalid token format');
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * 取得儲存的 Token
 */
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  // 也清除 localStorage 中的舊 token（向後相容）
  localStorage.removeItem('token');
}

/**
 * 清除所有敏感資料
 */
export function clearAllSensitiveData(): void {
  clearToken();
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(STATE_EXPIRY_KEY);
  // 清除可能的其他敏感資料
  sessionStorage.clear();
}

/**
 * 消毒使用者輸入（防止 XSS）
 */
export function sanitizeInput(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * 驗證 URL 是否安全（防止 Open Redirect）
 */
export function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    // 只允許同源重導向
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
