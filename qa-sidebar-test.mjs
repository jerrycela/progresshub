import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/admin/progresshub_claude/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright');
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://progresshub-cb.zeabur.app';
const SCREENSHOT_DIR = '/Users/admin/progresshub_claude/qa-screenshots';
const RESULTS = [];
let shotIndex = 20;

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
  await page.locator('input[type="text"]').first().fill('QA-Sidebar-Tester');
  await page.locator('button:has-text("管理者")').click();

  const respPromise = page.waitForResponse(r => r.url().includes('/auth/'), { timeout: 15000 }).catch(() => null);
  await page.locator('button:has-text("Demo 身分登入")').click();
  const resp = await respPromise;
  console.log(`  Login API: ${resp?.status()}`);

  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 10000 }).catch(() => {});
  await idle(page);

  const url = page.url();
  if (url.includes('/login')) {
    console.log('LOGIN FAILED - aborting');
    await browser.close();
    return;
  }
  console.log(`  Logged in, at: ${url}`);

  // ===== SIDEBAR ANALYSIS =====
  console.log('\n=== SIDEBAR DEEP ANALYSIS ===');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
  await idle(page);

  // Dump full DOM structure to understand sidebar
  const sidebarInfo = await page.evaluate(() => {
    // Find sidebar-like containers
    const candidates = [
      ...document.querySelectorAll('[class*="sidebar"], [class*="side-bar"], [class*="Sidebar"]'),
      ...document.querySelectorAll('nav, aside'),
      ...document.querySelectorAll('[class*="menu"], [class*="Menu"]'),
    ];

    // Also look for the left-side area
    const allDivs = document.querySelectorAll('div');
    const leftDivs = [];
    allDivs.forEach(d => {
      const rect = d.getBoundingClientRect();
      if (rect.left === 0 && rect.width < 300 && rect.height > 400) {
        leftDivs.push({
          tag: d.tagName,
          classes: d.className.substring(0, 200),
          id: d.id,
          children: d.children.length,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    });

    // Find all clickable items with text
    const clickableItems = [];
    document.querySelectorAll('a, [role="link"], [class*="router-link"], [onClick]').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.left < 250 && rect.width > 0) { // left side
        clickableItems.push({
          tag: el.tagName,
          href: el.getAttribute('href'),
          text: el.textContent.trim().substring(0, 50),
          classes: el.className.substring(0, 150),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width) }
        });
      }
    });

    return {
      candidates: candidates.map(c => ({
        tag: c.tagName,
        classes: c.className.substring(0, 200),
        id: c.id,
        childCount: c.children.length,
      })),
      leftDivs: leftDivs.slice(0, 10),
      clickableItems,
    };
  });

  console.log('\n  Sidebar candidates:', JSON.stringify(sidebarInfo.candidates, null, 2));
  console.log('\n  Left-side divs:', JSON.stringify(sidebarInfo.leftDivs.slice(0, 5), null, 2));
  console.log('\n  Left clickable items:', JSON.stringify(sidebarInfo.clickableItems, null, 2));

  // Record sidebar findings
  if (sidebarInfo.candidates.length > 0) {
    record('SIDEBAR', 'Sidebar container found', 'PASS', `${sidebarInfo.candidates.length} candidates`);
  } else if (sidebarInfo.leftDivs.length > 0) {
    record('SIDEBAR', 'Sidebar container found', 'PASS', `Found via left-div heuristic: ${sidebarInfo.leftDivs.length} divs`);
  } else {
    record('SIDEBAR', 'Sidebar container found', 'FAIL');
  }

  const navItems = sidebarInfo.clickableItems;
  record('SIDEBAR', 'Navigation items found', navItems.length > 0 ? 'PASS' : 'FAIL', `${navItems.length} items`);

  // ===== TEST SIDEBAR NAVIGATION =====
  console.log('\n=== SIDEBAR CLICK NAVIGATION ===');

  const expectedPages = [
    { text: '儀表板', path: '/dashboard' },
    { text: '任務池', path: '/task-pool' },
    { text: '我的任務', path: '/my-tasks' },
    { text: '甘特圖', path: '/gantt' },
    { text: '角色權限', path: '/admin' },
    { text: '追殺清單', path: '/pm/chase' },
    { text: '職能負載', path: '/pm/workload' },
    { text: '專案管理', path: '/projects' },
    { text: '員工管理', path: '/admin/users' },
  ];

  for (const expected of expectedPages) {
    try {
      // Try clicking by text in left sidebar area
      const sidebarItem = page.locator(`text="${expected.text}"`).first();
      const isVisible = await sidebarItem.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        // Check position - should be on the left side
        const box = await sidebarItem.boundingBox();
        if (box && box.x < 250) {
          await sidebarItem.click();
          await idle(page, 5000);

          const currentUrl = page.url();
          const landed = currentUrl.includes(expected.path);
          record('SIDEBAR-NAV', `Click "${expected.text}"`, landed ? 'PASS' : 'WARN',
            `Expected ${expected.path}, got ${currentUrl}`);

          // Check active/highlight state
          const itemClasses = await sidebarItem.evaluate(el => {
            // Walk up to find the link/container with active class
            let node = el;
            for (let i = 0; i < 5; i++) {
              if (!node) break;
              const cls = node.className || '';
              if (cls.includes('active') || cls.includes('bg-') || cls.includes('selected') || cls.includes('current') || cls.includes('router-link-active')) {
                return cls;
              }
              node = node.parentElement;
            }
            return el.className || '';
          });

          const hasActiveClass = itemClasses.includes('active') || itemClasses.includes('bg-') ||
            itemClasses.includes('selected') || itemClasses.includes('current') || itemClasses.includes('router-link-active');
          record('SIDEBAR-NAV', `"${expected.text}" active highlight`, hasActiveClass ? 'PASS' : 'WARN',
            `classes: ${itemClasses.substring(0, 100)}`);
        } else {
          record('SIDEBAR-NAV', `"${expected.text}" in sidebar`, 'WARN', `Element not in sidebar area (x=${box?.x})`);
        }
      } else {
        record('SIDEBAR-NAV', `"${expected.text}" visible`, 'WARN', 'Not found or not visible');
      }
    } catch (e) {
      record('SIDEBAR-NAV', `"${expected.text}"`, 'FAIL', e.message.substring(0, 100));
    }
  }

  await shot(page, 'sidebar-final');

  // ===== ADMIN MENU CHECK =====
  console.log('\n=== ADMIN MENU ITEMS ===');
  const sysManageSection = await page.locator('text="系統管理"').isVisible({ timeout: 2000 }).catch(() => false);
  record('SIDEBAR', 'System admin section (系統管理)', sysManageSection ? 'PASS' : 'WARN');

  const adminItems = ['員工管理', '角色權限'];
  for (const item of adminItems) {
    const visible = await page.locator(`text="${item}"`).first().isVisible({ timeout: 1000 }).catch(() => false);
    record('SIDEBAR', `Admin item "${item}" visible`, visible ? 'PASS' : 'WARN');
  }

  // ===== SUMMARY =====
  console.log('\n==========================================');
  console.log('    SIDEBAR QA RESULTS');
  console.log('==========================================');
  const pass = RESULTS.filter(r => r.status === 'PASS').length;
  const fail = RESULTS.filter(r => r.status === 'FAIL').length;
  const warn = RESULTS.filter(r => r.status === 'WARN').length;
  console.log(`  PASS: ${pass} | FAIL: ${fail} | WARN: ${warn}`);

  RESULTS.forEach(r => {
    const icon = r.status === 'PASS' ? '[PASS]' : r.status === 'FAIL' ? '[FAIL]' : '[WARN]';
    console.log(`  ${icon} ${r.area} > ${r.item}${r.detail ? ': ' + r.detail : ''}`);
  });

  await browser.close();
  console.log('\nDone.');
})();
