import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/admin/progresshub_claude/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright');
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://progresshub-cb.zeabur.app';
const SCREENSHOT_DIR = '/Users/admin/progresshub_claude/qa-screenshots';
const RESULTS = [];
let shotIndex = 1;

function record(area, item, status, detail = '') {
  RESULTS.push({ area, item, status, detail });
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(`${icon} ${area} > ${item}${detail ? ' — ' + detail : ''}`);
}

async function shot(page, name) {
  const num = String(shotIndex++).padStart(2, '0');
  const file = path.join(SCREENSHOT_DIR, `dash-${num}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  [screenshot] dash-${num}-${name}.png`);
  return file;
}

async function idle(page, ms = 10000) {
  try { await page.waitForLoadState('networkidle', { timeout: ms }); } catch {}
}

(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Capture network failures
  const networkErrors = [];
  page.on('requestfailed', req => {
    networkErrors.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  // ========== LOGIN ==========
  console.log('\n=== STEP 1: LOGIN ===');
  let loggedIn = false;
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await shot(page, 'login-page');

    // Fill name
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill('QA-Dashboard-Tester');

    // Click "管理者" button for ADMIN role
    const adminBtn = page.locator('button:has-text("管理者")');
    if (await adminBtn.isVisible({ timeout: 3000 })) {
      await adminBtn.click();
      record('LOGIN', 'Select ADMIN role (管理者)', 'PASS');
    } else {
      record('LOGIN', 'Select ADMIN role (管理者)', 'FAIL', 'Button not found');
    }

    // Select some projects for richer data
    const projectCheckboxes = page.locator('input[type="checkbox"]');
    const projCount = await projectCheckboxes.count();
    if (projCount > 0) {
      // Select first 3 projects
      for (let i = 0; i < Math.min(3, projCount); i++) {
        await projectCheckboxes.nth(i).check();
      }
      record('LOGIN', 'Select projects', 'PASS', `Checked ${Math.min(3, projCount)} projects`);
    }

    await shot(page, 'login-filled');

    // Listen for API response to understand login result
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/auth/') || resp.url().includes('/login'),
      { timeout: 15000 }
    ).catch(() => null);

    // Click "以 Demo 身分登入" button
    const demoBtn = page.locator('button:has-text("Demo 身分登入")');
    await demoBtn.click();

    const apiResp = await responsePromise;
    if (apiResp) {
      const status = apiResp.status();
      console.log(`  API Response: ${status} ${apiResp.url()}`);
      if (status >= 400) {
        let body;
        try { body = await apiResp.text(); } catch { body = 'N/A'; }
        console.log(`  Response body: ${body.substring(0, 500)}`);
        record('LOGIN', 'Demo login API', 'FAIL', `HTTP ${status}: ${body.substring(0, 200)}`);
      } else {
        record('LOGIN', 'Demo login API', 'PASS', `HTTP ${status}`);
      }
    }

    // Wait for navigation
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 }).catch(() => {});
    await idle(page);
    await shot(page, 'after-login');

    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);
    if (!currentUrl.includes('/login')) {
      loggedIn = true;
      record('LOGIN', 'Login redirect', 'PASS', `Redirected to ${currentUrl}`);
    } else {
      // Check for error messages on page
      const errorText = await page.locator('.text-red-400, .text-red-500, [class*="error"]').allTextContents();
      record('LOGIN', 'Login redirect', 'FAIL', `Still on login page. Errors: ${errorText.join('; ') || 'none visible'}`);

      // Try to read page state for debugging
      const pageText = await page.textContent('body');
      const relevant = pageText.substring(0, 300);
      console.log(`  Page text (first 300): ${relevant}`);
    }
  } catch (e) {
    record('LOGIN', 'Login flow', 'FAIL', e.message);
    await shot(page, 'login-error');
  }

  if (!loggedIn) {
    console.log('\n*** LOGIN FAILED - Attempting direct URL navigation to test pages ***');
    // Some SPA apps may still allow page access; try navigating directly
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    const dashUrl = page.url();
    if (dashUrl.includes('/dashboard')) {
      console.log('  Direct navigation to /dashboard succeeded (may have limited data)');
      loggedIn = true; // partial
    } else {
      console.log(`  Redirected to: ${dashUrl}`);
    }
  }

  // ========== DASHBOARD ==========
  console.log('\n=== STEP 2: DASHBOARD ===');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await idle(page);
    await shot(page, 'dashboard-full');

    const dashUrl = page.url();
    if (dashUrl.includes('/dashboard')) {
      record('DASHBOARD', 'Page accessible', 'PASS');
    } else {
      record('DASHBOARD', 'Page accessible', 'FAIL', `Redirected to ${dashUrl}`);
    }

    // Gather full page text for analysis
    const bodyText = await page.textContent('body');

    // Stats cards - look for numbers
    const bigNumbers = await page.locator('.text-2xl, .text-3xl, .text-4xl, h2, h3').allTextContents();
    const numericValues = bigNumbers.filter(t => /\d+/.test(t));
    record('DASHBOARD', 'Statistics data', numericValues.length > 0 ? 'PASS' : 'WARN',
      numericValues.length > 0 ? `Values: ${numericValues.slice(0, 6).join(', ')}` : 'No numeric stats found');

    // Quick action buttons/links
    const allButtons = await page.locator('button, a').allTextContents();
    const actionButtons = allButtons.filter(t =>
      t.includes('任務') || t.includes('專案') || t.includes('新增') || t.includes('查看')
    );
    record('DASHBOARD', 'Quick actions', actionButtons.length > 0 ? 'PASS' : 'WARN',
      actionButtons.length > 0 ? `Found: ${actionButtons.slice(0, 5).join(', ')}` : 'None found');

    // Chase list
    const hasChase = bodyText.includes('追殺') || bodyText.includes('Chase') || bodyText.includes('逾期');
    record('DASHBOARD', 'Chase list section', hasChase ? 'PASS' : 'WARN', hasChase ? 'Visible' : 'Not found');

    // Workload
    const hasWorkload = bodyText.includes('工作負載') || bodyText.includes('Workload') || bodyText.includes('負載');
    record('DASHBOARD', 'Workload section', hasWorkload ? 'PASS' : 'WARN', hasWorkload ? 'Visible' : 'Not found');

    // Console errors on this page
    if (consoleErrors.length > 0) {
      record('DASHBOARD', 'Console errors', 'WARN', `${consoleErrors.length} errors: ${consoleErrors.slice(-3).join('; ').substring(0, 200)}`);
    }

  } catch (e) {
    record('DASHBOARD', 'Overall', 'FAIL', e.message);
    await shot(page, 'dashboard-error');
  }

  // ========== MY TASKS ==========
  console.log('\n=== STEP 3: MY TASKS ===');
  try {
    consoleErrors.length = 0;
    await page.goto(`${BASE_URL}/my-tasks`, { waitUntil: 'networkidle', timeout: 15000 });
    await idle(page);
    await shot(page, 'my-tasks');

    const url = page.url();
    if (url.includes('/my-tasks')) {
      record('MY-TASKS', 'Page accessible', 'PASS');
    } else {
      record('MY-TASKS', 'Page accessible', 'FAIL', `Redirected to ${url}`);
    }

    const bodyText = await page.textContent('body');

    // Task list items
    const hasTaskContent = bodyText.includes('任務') || bodyText.includes('Task') || bodyText.includes('進行中') || bodyText.includes('待辦');
    record('MY-TASKS', 'Task content visible', hasTaskContent ? 'PASS' : 'WARN', hasTaskContent ? 'Task-related content found' : 'No task content');

    // Filters / group controls
    const selects = await page.locator('select').count();
    const filterBtns = await page.locator('button:has-text("篩選"), button:has-text("分組"), button:has-text("Filter"), [class*="filter"]').count();
    const tabBtns = await page.locator('[role="tab"], [class*="tab"]').count();
    const totalControls = selects + filterBtns + tabBtns;
    record('MY-TASKS', 'Filter/group controls', totalControls > 0 ? 'PASS' : 'WARN',
      `selects=${selects}, filterBtns=${filterBtns}, tabs=${tabBtns}`);

    // Task card info completeness
    const hasAssignee = bodyText.includes('負責') || bodyText.includes('Assignee') || bodyText.includes('指派');
    const hasDueDate = bodyText.includes('截止') || bodyText.includes('Due') || bodyText.includes('到期') || /\d{4}[-/]\d{2}[-/]\d{2}/.test(bodyText);
    record('MY-TASKS', 'Task card info - assignee', hasAssignee ? 'PASS' : 'WARN');
    record('MY-TASKS', 'Task card info - due date', hasDueDate ? 'PASS' : 'WARN');

    if (consoleErrors.length > 0) {
      record('MY-TASKS', 'Console errors', 'WARN', consoleErrors.slice(-3).join('; ').substring(0, 200));
    }

  } catch (e) {
    record('MY-TASKS', 'Overall', 'FAIL', e.message);
    await shot(page, 'my-tasks-error');
  }

  // ========== PM CHASE ==========
  console.log('\n=== STEP 4: PM CHASE ===');
  try {
    consoleErrors.length = 0;
    await page.goto(`${BASE_URL}/pm/chase`, { waitUntil: 'networkidle', timeout: 15000 });
    await idle(page);
    await shot(page, 'pm-chase');

    const url = page.url();
    if (url.includes('/pm/chase') || url.includes('/pm')) {
      record('PM-CHASE', 'Page accessible', 'PASS');
    } else {
      record('PM-CHASE', 'Page accessible', 'FAIL', `Redirected to ${url}`);
    }

    const bodyText = await page.textContent('body');
    const hasChaseContent = bodyText.includes('追殺') || bodyText.includes('Chase') || bodyText.includes('逾期') || bodyText.includes('Overdue') || bodyText.includes('天');
    record('PM-CHASE', 'Chase content', hasChaseContent ? 'PASS' : 'WARN', hasChaseContent ? 'Chase data found' : 'No chase data');

    // Stats summary cards
    const statsCards = await page.locator('[class*="stat"], [class*="summary"], [class*="card"]').count();
    record('PM-CHASE', 'Stats cards', statsCards > 0 ? 'PASS' : 'WARN', `${statsCards} elements found`);

    if (consoleErrors.length > 0) {
      record('PM-CHASE', 'Console errors', 'WARN', consoleErrors.slice(-3).join('; ').substring(0, 200));
    }
  } catch (e) {
    record('PM-CHASE', 'Overall', 'FAIL', e.message);
  }

  // ========== PM WORKLOAD ==========
  console.log('\n=== STEP 5: PM WORKLOAD ===');
  try {
    consoleErrors.length = 0;
    await page.goto(`${BASE_URL}/pm/workload`, { waitUntil: 'networkidle', timeout: 15000 });
    await idle(page);
    await shot(page, 'pm-workload');

    const url = page.url();
    if (url.includes('/pm/workload') || url.includes('/pm')) {
      record('PM-WORKLOAD', 'Page accessible', 'PASS');
    } else {
      record('PM-WORKLOAD', 'Page accessible', 'FAIL', `Redirected to ${url}`);
    }

    const bodyText = await page.textContent('body');
    const hasWL = bodyText.includes('工作負載') || bodyText.includes('Workload') || bodyText.includes('負載') || bodyText.includes('workload');
    record('PM-WORKLOAD', 'Workload content', hasWL ? 'PASS' : 'WARN');

    const hasMembers = bodyText.includes('人') || bodyText.includes('員') || bodyText.includes('Member');
    record('PM-WORKLOAD', 'Member data', hasMembers ? 'PASS' : 'WARN');

    if (consoleErrors.length > 0) {
      record('PM-WORKLOAD', 'Console errors', 'WARN', consoleErrors.slice(-3).join('; ').substring(0, 200));
    }
  } catch (e) {
    record('PM-WORKLOAD', 'Overall', 'FAIL', e.message);
  }

  // ========== RWD TESTS ==========
  console.log('\n=== STEP 6: RWD TESTS ===');
  const rwdTests = [
    { path: '/pm/chase', name: 'PM Chase', width: 375, label: 'mobile' },
    { path: '/pm/chase', name: 'PM Chase', width: 768, label: 'tablet' },
    { path: '/pm/workload', name: 'PM Workload', width: 375, label: 'mobile' },
    { path: '/dashboard', name: 'Dashboard', width: 375, label: 'mobile' },
  ];

  for (const t of rwdTests) {
    try {
      await page.setViewportSize({ width: t.width, height: 812 });
      await page.goto(`${BASE_URL}${t.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await idle(page);
      await shot(page, `rwd-${t.name.toLowerCase().replace(/\s/g, '-')}-${t.label}`);

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      record('RWD', `${t.name} ${t.label} (${t.width}px) overflow`, !overflow ? 'PASS' : 'WARN',
        overflow ? 'Horizontal scroll detected' : 'OK');

      // Check if content is reasonably laid out (no extremely small text or cut-off)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      record('RWD', `${t.name} ${t.label} body width`, bodyWidth <= t.width + 20 ? 'PASS' : 'WARN',
        `body=${bodyWidth}px, viewport=${t.width}px`);
    } catch (e) {
      record('RWD', `${t.name} ${t.label}`, 'FAIL', e.message.substring(0, 100));
    }
  }

  // Reset viewport
  await page.setViewportSize({ width: 1440, height: 900 });

  // ========== SIDEBAR NAVIGATION ==========
  console.log('\n=== STEP 7: SIDEBAR NAVIGATION ===');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await idle(page);

    // Dump the full DOM structure to understand sidebar
    const sidebarHTML = await page.evaluate(() => {
      const nav = document.querySelector('nav') || document.querySelector('aside') || document.querySelector('[class*="sidebar"]');
      return nav ? nav.outerHTML.substring(0, 3000) : 'NO NAV/ASIDE FOUND';
    });
    console.log(`  Sidebar HTML (first 500): ${sidebarHTML.substring(0, 500)}`);

    // Find all links in the page
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim().substring(0, 50),
        visible: a.offsetParent !== null || a.offsetWidth > 0,
        parentClasses: a.parentElement?.className || ''
      })).filter(l => l.href && l.href.startsWith('/'));
    });
    console.log(`  Total internal links: ${allLinks.length}`);
    allLinks.forEach(l => console.log(`    ${l.visible ? 'V' : 'H'} ${l.href} - "${l.text}"`));

    // Check if sidebar exists
    const hasSidebar = sidebarHTML !== 'NO NAV/ASIDE FOUND';
    record('SIDEBAR', 'Sidebar element exists', hasSidebar ? 'PASS' : 'FAIL', hasSidebar ? 'Found' : 'Not found');

    // Check router-link or anchor based navigation
    const routerLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[class*="router-link"], a.router-link-active, [class*="nav-link"], [class*="menu-item"]')).map(el => ({
        text: el.textContent.trim(),
        classes: el.className
      }));
    });
    console.log(`  Router/nav links: ${routerLinks.length}`);
    routerLinks.forEach(l => console.log(`    "${l.text}" classes="${l.classes}"`));

    // Test navigation by clicking sidebar links
    if (allLinks.length > 0) {
      const testPaths = ['/dashboard', '/my-tasks', '/task-pool', '/gantt', '/projects', '/pm/chase', '/pm/workload'];
      for (const p of testPaths) {
        const link = allLinks.find(l => l.href === p);
        if (link && link.visible) {
          try {
            await page.click(`a[href="${p}"]`, { timeout: 3000 });
            await idle(page, 5000);
            const url = page.url();
            record('SIDEBAR', `Navigate to ${p}`, url.includes(p) ? 'PASS' : 'FAIL', `Landed: ${url}`);

            // Check active state
            const activeClasses = await page.locator(`a[href="${p}"]`).first().getAttribute('class').catch(() => '');
            const isActive = activeClasses && (activeClasses.includes('active') || activeClasses.includes('bg-') || activeClasses.includes('selected') || activeClasses.includes('current'));
            record('SIDEBAR', `${p} active highlight`, isActive ? 'PASS' : 'WARN', `classes: ${(activeClasses || '').substring(0, 100)}`);
          } catch (e) {
            record('SIDEBAR', `Navigate to ${p}`, 'FAIL', e.message.substring(0, 80));
          }
        } else {
          record('SIDEBAR', `Nav link for ${p}`, link ? 'WARN' : 'WARN', link ? 'Not visible' : 'Not found');
        }
      }
    } else {
      record('SIDEBAR', 'Navigation links', 'FAIL', 'No internal links found on page');
    }

    // Check admin-only items (since we're ADMIN)
    const adminVisible = allLinks.some(l => l.href.includes('/admin'));
    record('SIDEBAR', 'Admin menu items (ADMIN role)', adminVisible ? 'PASS' : 'WARN', adminVisible ? 'Admin links visible' : 'No admin links');

    await shot(page, 'sidebar-navigation');

  } catch (e) {
    record('SIDEBAR', 'Overall', 'FAIL', e.message);
  }

  // ========== NETWORK ERROR SUMMARY ==========
  if (networkErrors.length > 0) {
    console.log('\n=== NETWORK ERRORS ===');
    networkErrors.forEach(e => console.log(`  ${e}`));
    record('NETWORK', 'Failed requests', 'WARN', `${networkErrors.length} failed: ${networkErrors.slice(0, 3).join('; ').substring(0, 200)}`);
  }

  // ========== FINAL SUMMARY ==========
  console.log('\n\n==========================================');
  console.log('         QA TEST SUMMARY');
  console.log('==========================================');
  const pass = RESULTS.filter(r => r.status === 'PASS').length;
  const fail = RESULTS.filter(r => r.status === 'FAIL').length;
  const warn = RESULTS.filter(r => r.status === 'WARN').length;
  console.log(`  PASS: ${pass} | FAIL: ${fail} | WARN: ${warn} | TOTAL: ${RESULTS.length}`);
  console.log('');

  if (fail > 0) {
    console.log('--- FAILURES ---');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  [FAIL] ${r.area} > ${r.item}`);
      console.log(`         ${r.detail}`);
    });
    console.log('');
  }

  if (warn > 0) {
    console.log('--- WARNINGS ---');
    RESULTS.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  [WARN] ${r.area} > ${r.item}: ${r.detail}`);
    });
    console.log('');
  }

  console.log('--- ALL PASS ---');
  RESULTS.filter(r => r.status === 'PASS').forEach(r => {
    console.log(`  [PASS] ${r.area} > ${r.item}${r.detail ? ': ' + r.detail : ''}`);
  });

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'qa-results.json'),
    JSON.stringify(RESULTS, null, 2)
  );
  console.log('\nResults saved to qa-screenshots/qa-results.json');

  await browser.close();
  console.log('Browser closed.');
})();
