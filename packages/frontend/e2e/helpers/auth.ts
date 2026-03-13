import { type Page } from '@playwright/test'

export const API_BASE = process.env.E2E_API_BASE || 'https://progress-hub.zeabur.app'

export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  PM: 'PM',
  PRODUCER: 'PRODUCER',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Login as a specific role via dev-login API, inject token, reload.
 * Each call is a fresh login — no shared state between tests.
 */
export async function loginAs(page: Page, role: Role, name?: string) {
  const displayName = name || `E2E-${role}`

  const res = await page.request.post(`${API_BASE}/api/auth/dev-login`, {
    data: { name: displayName, permissionLevel: role },
  })

  if (!res.ok()) {
    throw new Error(`Login failed for ${role}: ${res.status()} ${await res.text()}`)
  }

  const body = await res.json()
  const token = body.data?.token || body.token
  const refreshToken = body.data?.refreshToken || body.refreshToken

  if (!token) {
    throw new Error(`No token returned for ${role}: ${JSON.stringify(body)}`)
  }

  // Navigate to frontend origin first (localStorage is per-origin)
  await page.goto('/')

  // Inject tokens
  await page.evaluate(
    ({ token, refreshToken }) => {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_refresh_token', refreshToken)
    },
    { token, refreshToken },
  )

  // Reload so auth store picks up the token
  await page.reload()
  await page.waitForLoadState('networkidle')
}

export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_refresh_token')
  })
  await page.reload()
}
