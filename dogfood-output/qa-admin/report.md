# Dogfood Report: ProgressHub Bug Fix Verification

| Field | Value |
|-------|-------|
| **Date** | 2026-03-11 |
| **App URL** | https://progresshub-cb.zeabur.app |
| **Session** | qa-admin |
| **Scope** | Bug fix verification — 5 specific fixes |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 0 |
| **Total** | **1** |

## Test Results

### TEST-01: Dashboard Stats NOT Zero

| Field | Value |
|-------|-------|
| **Result** | PASS |
| **URL** | https://progresshub-cb.zeabur.app/dashboard |
| **Screenshot** | screenshots/01-dashboard-stats.png |

**Findings:** Dashboard stats cards show non-zero values after ADMIN login:
- 總任務數: 19
- 已完成: 2
- 進行中: 13
- 待認領: 3

The fix is working. Stats load correctly from backend API.

---

### TEST-02: Dashboard Task Cards Clickable

| Field | Value |
|-------|-------|
| **Result** | PASS |
| **URL** | https://progresshub-cb.zeabur.app/dashboard |
| **Screenshot** | screenshots/02-dashboard-employee-tasks.png, screenshots/02b-task-detail-page.png |
| **Video** | videos/02-task-click.webm |

**Findings:** Tested with EMPLOYEE role (QA Employee). Dashboard shows task cards "設計主角立繪" and "UI 介面設計". Clicking a task card navigated to `/task-pool/task-1` (task detail page).

The fix is working. Task cards correctly navigate to detail pages.

**Note:** ADMIN role does not show task cards in "我的進行中任務" section — this is expected behavior as ADMIN has no personally assigned tasks.

---

### TEST-03: Project List Shows Owner Names

| Field | Value |
|-------|-------|
| **Result** | PARTIAL PASS — Medium finding |
| **URL** | https://progresshub-cb.zeabur.app/projects |
| **Screenshot** | screenshots/03-projects-owner-names.png |

**Findings:**
- Real seed projects (UI 改版計畫, 新手教學系統, PVP 對戰系統, etc.) correctly display owner names: 張大偉, 黃美玲
- QA test projects created by the demo ADMIN user show "未知" (unknown) — this is because demo ADMIN accounts are created as virtual users without a real employee record, so `createdById` and `createdByName` are both null

API response confirms real projects have correct `createdByName` values. The fix is working for production data.

**Remaining issue:** Demo admin-created projects show "未知" — acceptable for test data but worth noting.

---

### TEST-04: Employee List Loads Fully (Not Truncated at 20)

| Field | Value |
|-------|-------|
| **Result** | PASS |
| **URL** | https://progresshub-cb.zeabur.app/admin/users |
| **Screenshot** | screenshots/04-employee-list-52.png |

**Findings:** Employee management page shows "共 52 人" with all 52 employees listed in the table (verified by row count in snapshot: 53 rows = 1 header + 52 data rows).

The old 20-employee truncation limit has been lifted. Fix is working correctly.

---

### TEST-05: Task Creation Assignee Dropdown Shows Employees

| Field | Value |
|-------|-------|
| **Result** | PASS |
| **URL** | https://progresshub-cb.zeabur.app/task-pool/create |
| **Screenshot** | screenshots/05-task-assignee-dropdown.png |

**Findings:** Task creation form in "指派任務" (Direct Assignment) mode shows a searchable dropdown with 50+ employees listed (123, Demo User, Jerry, QA Admin, 張大偉, 黃美玲, 李小龍, etc.).

The assignee dropdown is loading employees correctly from the API. Fix is working.

---

## Issues

### ISSUE-001: Demo Admin-Created Projects Show "未知" as Owner

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | visual / content |
| **URL** | https://progresshub-cb.zeabur.app/projects |
| **Repro Video** | N/A |
| **Screenshot** | screenshots/03-projects-owner-names.png |

**Description:** Projects created by demo login users (ADMIN role) display "負責人：未知" because demo accounts are virtual users without an underlying `Employee` record. Real seeded projects correctly show owner names.

**Impact:** Cosmetic issue — only affects QA/test projects, not production data. However it may confuse QA testers.

**Suggested Fix:** When creating projects via demo login, either (1) map demo user to a real Employee record, or (2) show the demo user's display name instead of "未知".

---

## Test Infrastructure Notes

- Demo login form is **not shown** on progresshub-cb.zeabur.app because `VITE_ENABLE_DEMO` is not set to `true` in the production build. Authentication was done by calling the backend `/api/auth/dev-login` endpoint directly via curl and injecting tokens into `localStorage`.
- All 5 targeted fixes were verified. 4 passed cleanly; 1 has a minor cosmetic finding related to demo user data mapping.

## Screenshot Index

| File | Description |
|------|-------------|
| screenshots/01-dashboard-stats.png | Dashboard with ADMIN user showing non-zero stats (19 tasks total) |
| screenshots/02-dashboard-employee-tasks.png | Dashboard with EMPLOYEE user showing task cards |
| screenshots/02b-task-detail-page.png | Task detail page after clicking task card |
| screenshots/03-projects-owner-names.png | Project list — real projects show owner names, QA test projects show "未知" |
| screenshots/04-employee-list-52.png | Employee management page showing all 52 employees |
| screenshots/05-task-assignee-dropdown.png | Task creation form with assignee dropdown open showing employees |
| videos/02-task-click.webm | Video recording of task card click navigation |
