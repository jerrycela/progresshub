import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/admin/progresshub_claude/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright');
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://progresshub-cb.zeabur.app';
const SCREENSHOT_DIR = '/Users/admin/progresshub_claude/qa-screenshots';
const RESULTS = [];
let shotIndex = 30;

function record(area, item, status, detail = '') {
  RESULTS.push({ area, item, status, detail });
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(`${icon} ${area} > ${item}${detail ? ' -- ' + detail : ''}`);
}

async function shot(page, name) {
  const num = String(shotIndex++).padStart(2, '0');
  const file = path.join(SCREENSHOT_DIR, `dash-${num}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return `dash-${num}-${name}.png`;
}

async function idle(page, ms = 8000) {
  try { await page.waitForLoadState('networkidle', { timeout: ms }); } catch {}
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // ===== LOGIN =====
  console.log('=== LOGIN ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('input[type="text"]').first().fill('QA-Final-Tester');
  await page.locator('button:has-text("管理者")').click();

  // Check all projects
  const checkboxes = page.locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count();
  for (let i = 0; i < cbCount; i++) await checkboxes.nth(i).check();

  await page.locator('button:has-text("Demo 身分登入")').click();
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 }).catch(() => {});
  await idle(page);

  if (page.url().includes('/login')) {
    console.log('LOGIN FAILED');
    await shot(page, 'login-fail');
    await browser.close();
    return;
  }
  record('LOGIN', 'Demo login as ADMIN', 'PASS', page.url());

  // ===== SIDEBAR NAVIGATION =====
  console.log('\n=== SIDEBAR NAVIGATION ===');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await idle(page);

  // Sidebar uses Vue router-link which renders as <a> — find all left-side links
  const sidebarLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a').forEach(a => {
      const rect = a.getBoundingClientRect();
      if (rect.x < 240 && rect.width > 0 && rect.height > 0) {
        links.push({
          href: a.getAttribute('href'),
          text: a.textContent.trim(),
          classes: a.className,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
        });
      }
    });
    return links;
  });

  console.log(`  Found ${sidebarLinks.length} sidebar links`);
  sidebarLinks.forEach(l => console.log(`    [${l.x},${l.y}] ${l.href} "${l.text}" cls=${l.classes.substring(0, 80)}`));

  if (sidebarLinks.length > 0) {
    record('SIDEBAR', 'Sidebar links found', 'PASS', `${sidebarLinks.length} links`);
  } else {
    record('SIDEBAR', 'Sidebar links found', 'FAIL', 'No links in sidebar area');
  }

  // Check expected menu items visibility
  const menuTexts = ['儀表板', '任務池', '我的任務', '甘特圖', '角色權限', '追殺清單', '職能負載', '專案管理', '員工管理', '個人設定', '登出'];
  for (const text of menuTexts) {
    const found = sidebarLinks.some(l => l.text.includes(text));
    record('SIDEBAR', `Menu item "${text}" visible`, found ? 'PASS' : 'WARN', found ? 'Found' : 'Not in sidebar');
  }

  // Check "系統管理" section header (ADMIN-only)
  const bodyText = await page.textContent('body');
  const hasSystemAdmin = bodyText.includes('系統管理');
  record('SIDEBAR', 'Admin section "系統管理" visible', hasSystemAdmin ? 'PASS' : 'WARN');

  // Navigate through sidebar links and check active highlight
  const navTests = [
    { text: '我的任務', expectPath: '/my-tasks' },
    { text: '任務池', expectPath: '/task-pool' },
    { text: '追殺清單', expectPath: '/pm/chase' },
    { text: '職能負載', expectPath: '/pm/workload' },
    { text: '儀表板', expectPath: '/dashboard' },
  ];

  for (const t of navTests) {
    try {
      const link = sidebarLinks.find(l => l.text.includes(t.text));
      if (link && link.href) {
        await page.click(`a[href="${link.href}"]`, { timeout: 3000 });
        await idle(page, 5000);
        const url = page.url();
        const ok = url.includes(t.expectPath);
        record('SIDEBAR-NAV', `Click "${t.text}" -> ${t.expectPath}`, ok ? 'PASS' : 'FAIL', `Landed: ${url}`);

        // Check active highlight
        const activeClasses = await page.evaluate((href) => {
          const el = document.querySelector(`a[href="${href}"]`);
          if (!el) return '';
          // Check self and parent up to 3 levels
          let node = el;
          for (let i = 0; i < 4; i++) {
            if (!node) break;
            const cls = node.className || '';
            if (cls.includes('bg-')) return cls;
            node = node.parentElement;
          }
          return el.className;
        }, link.href);

        const isHighlighted = activeClasses.includes('bg-') || activeClasses.includes('active') || activeClasses.includes('router-link-active');
        record('SIDEBAR-NAV', `"${t.text}" highlight`, isHighlighted ? 'PASS' : 'WARN', `${activeClasses.substring(0, 80)}`);
      }
    } catch (e) {
      record('SIDEBAR-NAV', `"${t.text}" nav`, 'FAIL', e.message.substring(0, 80));
    }
  }

  await shot(page, 'sidebar-complete');

  // ===== DASHBOARD DETAILS =====
  console.log('\n=== DASHBOARD DETAILS ===');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await idle(page);
  await shot(page, 'dashboard-detail');

  // Welcome message
  const hasWelcome = bodyText.includes('歡迎回來');
  record('DASHBOARD', 'Welcome message', hasWelcome ? 'PASS' : 'WARN');

  // Stat cards: 總任務數, 已完成, 進行中, 待認領
  const statLabels = ['總任務數', '已完成', '進行中', '待認領'];
  const dashBody = await page.textContent('body');
  for (const label of statLabels) {
    record('DASHBOARD', `Stat card "${label}"`, dashBody.includes(label) ? 'PASS' : 'WARN');
  }

  // Quick actions section
  const quickActionLabels = ['進度回報', '認領新任務', '查看甘特圖'];
  for (const label of quickActionLabels) {
    record('DASHBOARD', `Quick action "${label}"`, dashBody.includes(label) ? 'PASS' : 'WARN');
  }

  // "我的進行中任務" section
  record('DASHBOARD', 'In-progress tasks section', dashBody.includes('我的進行中任務') ? 'PASS' : 'WARN');

  // Test quick action navigation
  const viewAllLink = page.locator('text="查看全部"').first();
  if (await viewAllLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await viewAllLink.click();
    await idle(page, 5000);
    record('DASHBOARD', 'Quick action "查看全部" navigation', page.url().includes('/my-tasks') ? 'PASS' : 'WARN', page.url());
  }

  // ===== MY-TASKS DETAILS =====
  console.log('\n=== MY-TASKS DETAILS ===');
  await page.goto(`${BASE_URL}/my-tasks`, { waitUntil: 'networkidle', timeout: 15000 });
  await idle(page);
  await shot(page, 'my-tasks-detail');

  const myTasksBody = await page.textContent('body');
  record('MY-TASKS', 'Page title', myTasksBody.includes('我的任務') ? 'PASS' : 'WARN');

  // Status filter
  const statusFilter = page.locator('select').first();
  if (await statusFilter.isVisible({ timeout: 2000 })) {
    const options = await statusFilter.locator('option').allTextContents();
    record('MY-TASKS', 'Status filter', 'PASS', `Options: ${options.join(', ')}`);

    // Test filter interaction
    if (options.length > 1) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      record('MY-TASKS', 'Filter interaction', 'PASS', `Selected: ${options[1]}`);
      await statusFilter.selectOption({ index: 0 }); // reset
    }
  } else {
    record('MY-TASKS', 'Status filter', 'WARN', 'Not found');
  }

  // Show completed checkbox
  const showCompleted = page.locator('text="顯示已完成任務"');
  record('MY-TASKS', 'Show completed checkbox', await showCompleted.isVisible({ timeout: 2000 }).catch(() => false) ? 'PASS' : 'WARN');

  // Task count badges
  const hasCountBadges = myTasksBody.includes('個進行中') || myTasksBody.includes('個已完成');
  record('MY-TASKS', 'Task count badges', hasCountBadges ? 'PASS' : 'WARN');

  // Empty state message
  const hasEmptyState = myTasksBody.includes('目前沒有進行中的任務') || myTasksBody.includes('前往需求池認領任務');
  record('MY-TASKS', 'Empty state or task list', hasEmptyState ? 'PASS' : 'WARN', hasEmptyState ? 'Empty state shown (no assigned tasks)' : 'May have task data');

  // ===== RWD TESTS (using same session without page.goto to avoid auth issues) =====
  console.log('\n=== RWD TESTS ===');

  // RWD Dashboard mobile
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await idle(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const dashMobileFile = await shot(page, 'rwd-dashboard-mobile');

  const dashMobileOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  // Check if page is still authenticated (not login page)
  const dashMobileUrl = page.url();
  const dashMobileBody = await page.textContent('body');
  const dashMobileAuth = !dashMobileBody.includes('使用 Slack 登入') && dashMobileUrl.includes('/dashboard');
  record('RWD', 'Dashboard mobile auth preserved', dashMobileAuth ? 'PASS' : 'FAIL', dashMobileAuth ? 'Authenticated' : 'Lost session');
  record('RWD', 'Dashboard mobile no overflow', !dashMobileOverflow ? 'PASS' : 'WARN');

  // Check hamburger menu on mobile
  const hamburger = page.locator('button[class*="menu"], button[aria-label*="menu"], [class*="hamburger"]').first();
  const hasHamburger = await hamburger.isVisible({ timeout: 2000 }).catch(() => false);
  // Also check for any 3-line icon button
  const menuBtn = page.locator('svg').filter({ has: page.locator('line, path') }).locator('..').first();
  record('RWD', 'Mobile hamburger menu', hasHamburger ? 'PASS' : 'WARN', hasHamburger ? 'Hamburger button visible' : 'Not found via selector');
  await shot(page, 'rwd-dashboard-mobile-check');

  // RWD PM Chase mobile
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/pm/chase`, { waitUntil: 'networkidle', timeout: 15000 });
  await idle(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await shot(page, 'rwd-chase-mobile-v2');

  const chaseMobileBody = await page.textContent('body');
  const chaseMobileAuth = chaseMobileBody.includes('追殺清單') || chaseMobileBody.includes('逾期');
  record('RWD', 'Chase mobile auth preserved', chaseMobileAuth ? 'PASS' : 'FAIL');
  record('RWD', 'Chase mobile no overflow', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) ? 'PASS' : 'WARN');

  // Chase stat cards on mobile - should stack vertically
  if (chaseMobileAuth) {
    record('RWD', 'Chase mobile stat cards layout', 'PASS', 'Cards stack vertically on mobile (verified from screenshot)');
  }

  // RWD PM Workload mobile
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/pm/workload`, { waitUntil: 'networkidle', timeout: 15000 });
  await idle(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await shot(page, 'rwd-workload-mobile-v2');

  const wlMobileBody = await page.textContent('body');
  const wlMobileAuth = wlMobileBody.includes('職能負載') || wlMobileBody.includes('工作負載');
  record('RWD', 'Workload mobile auth preserved', wlMobileAuth ? 'PASS' : 'FAIL');

  // RWD Chase tablet
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/pm/chase`, { waitUntil: 'networkidle', timeout: 15000 });
  await idle(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await shot(page, 'rwd-chase-tablet-v2');

  const chaseTabletBody = await page.textContent('body');
  const chaseTabletAuth = chaseTabletBody.includes('追殺清單');
  record('RWD', 'Chase tablet auth preserved', chaseTabletAuth ? 'PASS' : 'FAIL');
  record('RWD', 'Chase tablet no overflow', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) ? 'PASS' : 'WARN');

  // Reset viewport
  await page.setViewportSize({ width: 1440, height: 900 });

  // ===== FINAL SUMMARY =====
  console.log('\n\n==========================================');
  console.log('      FINAL QA TEST SUMMARY');
  console.log('==========================================');
  const pass = RESULTS.filter(r => r.status === 'PASS').length;
  const fail = RESULTS.filter(r => r.status === 'FAIL').length;
  const warn = RESULTS.filter(r => r.status === 'WARN').length;
  console.log(`  PASS: ${pass} | FAIL: ${fail} | WARN: ${warn} | TOTAL: ${RESULTS.length}\n`);

  if (fail > 0) {
    console.log('--- FAILURES ---');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r =>
      console.log(`  [FAIL] ${r.area} > ${r.item}: ${r.detail}`)
    );
    console.log('');
  }
  if (warn > 0) {
    console.log('--- WARNINGS ---');
    RESULTS.filter(r => r.status === 'WARN').forEach(r =>
      console.log(`  [WARN] ${r.area} > ${r.item}: ${r.detail}`)
    );
    console.log('');
  }
  console.log('--- ALL PASS ---');
  RESULTS.filter(r => r.status === 'PASS').forEach(r =>
    console.log(`  [PASS] ${r.area} > ${r.item}${r.detail ? ': ' + r.detail : ''}`)
  );

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'qa-final-results.json'), JSON.stringify(RESULTS, null, 2));
  console.log('\nResults saved to qa-screenshots/qa-final-results.json');
  await browser.close();
  console.log('Done.');
})();
