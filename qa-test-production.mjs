/**
 * ProgressHub Production QA Test
 * Tests: https://progresshub.zeabur.app
 *
 * Usage: node qa-test-production.mjs
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://progresshub.zeabur.app';
const SCREENSHOT_DIR = '/Users/admin/progresshub_claude/qa-screenshots';
const RESULTS = [];

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function log(message) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${message}`);
}

function addResult(page, action, result, details = '') {
  RESULTS.push({ page, action, result, details });
  const icon = result === 'PASS' ? '✓' : result === 'FAIL' ? '✗' : '?';
  log(`  ${icon} [${result}] ${action}${details ? ': ' + details : ''}`);
}

async function takeScreenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  log(`  Screenshot saved: ${filePath}`);
  return filePath;
}

async function waitAndClick(page, selector, description, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
    return true;
  } catch (e) {
    return false;
  }
}

async function runTests() {
  log('Starting ProgressHub QA Tests...');
  log(`Target: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-TW',
  });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Capture network errors
  const networkErrors = [];
  page.on('requestfailed', req => {
    networkErrors.push({ url: req.url(), reason: req.failure()?.errorText });
  });

  try {
    // =========================================================
    // TEST 1: Login Page
    // =========================================================
    log('\n=== TEST: Login Page ===');

    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
      addResult('Login Page', 'Page loads', 'PASS');
    } catch (e) {
      addResult('Login Page', 'Page loads', 'FAIL', e.message);
    }

    await takeScreenshot(page, '01-login-page');

    // Check URL
    const loginUrl = page.url();
    if (loginUrl.includes('/login')) {
      addResult('Login Page', 'URL contains /login', 'PASS', loginUrl);
    } else {
      addResult('Login Page', 'URL contains /login', 'FAIL', loginUrl);
    }

    // Check for name input
    const nameInput = await page.locator('input[placeholder*="名字"], input[placeholder*="name"], input[name="name"], input[type="text"]').first();
    const nameInputVisible = await nameInput.isVisible().catch(() => false);
    addResult('Login Page', 'Name input visible', nameInputVisible ? 'PASS' : 'FAIL');

    // Check for demo login button or role buttons
    const demoButtons = await page.locator('button').all();
    log(`  Found ${demoButtons.length} buttons on login page`);

    const buttonTexts = [];
    for (const btn of demoButtons) {
      const text = await btn.textContent().catch(() => '');
      buttonTexts.push(text.trim());
    }
    log(`  Button texts: ${buttonTexts.join(', ')}`);
    addResult('Login Page', 'Buttons found', demoButtons.length > 0 ? 'PASS' : 'FAIL', `Buttons: ${buttonTexts.join(', ')}`);

    // =========================================================
    // TEST 2: Demo Login as ADMIN
    // =========================================================
    log('\n=== TEST: Demo Login as ADMIN ===');

    // Try to fill name field
    let loginSuccess = false;

    try {
      // Look for name input field
      const nameFieldSelectors = [
        'input[placeholder*="名字"]',
        'input[placeholder*="姓名"]',
        'input[placeholder*="name"]',
        'input[name="name"]',
        'input[type="text"]:first-of-type',
        'input.input',
      ];

      let nameField = null;
      for (const sel of nameFieldSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          nameField = el;
          log(`  Found name field with selector: ${sel}`);
          break;
        }
      }

      if (nameField) {
        await nameField.fill('QA測試員');
        addResult('Demo Login', 'Fill name field', 'PASS', 'QA測試員');
      } else {
        addResult('Demo Login', 'Fill name field', 'FAIL', 'Name input not found');
      }

      // Look for ADMIN button or role selector
      const adminSelectors = [
        'button:has-text("ADMIN")',
        'button:has-text("管理員")',
        '[data-role="ADMIN"]',
        'button[value="ADMIN"]',
        'input[value="ADMIN"]',
      ];

      let adminClicked = false;
      for (const sel of adminSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          await el.click();
          adminClicked = true;
          log(`  Clicked ADMIN with selector: ${sel}`);
          break;
        }
      }

      if (!adminClicked) {
        // Try to find any role selection mechanism
        const roleOptions = await page.locator('select, [role="listbox"], .role-select').all();
        if (roleOptions.length > 0) {
          log(`  Found role options: ${roleOptions.length}`);
          // Try select element
          const select = page.locator('select').first();
          if (await select.isVisible().catch(() => false)) {
            await select.selectOption({ label: 'ADMIN' }).catch(() => select.selectOption({ index: 0 }));
            adminClicked = true;
          }
        }
        addResult('Demo Login', 'Select ADMIN role', adminClicked ? 'PASS' : 'INFO', adminClicked ? '' : 'ADMIN button not found, trying default login');
      } else {
        addResult('Demo Login', 'Select ADMIN role', 'PASS');
      }

      // Look for submit/login button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("登入")',
        'button:has-text("Login")',
        'button:has-text("確認")',
        'button:has-text("繼續")',
        'button:has-text("Demo")',
        'button:has-text("demo")',
      ];

      let submitClicked = false;
      for (const sel of submitSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          await el.click();
          submitClicked = true;
          log(`  Clicked submit with selector: ${sel}`);
          break;
        }
      }

      if (!submitClicked) {
        // Just click the last button if nothing else worked
        const allBtns = await page.locator('button').all();
        if (allBtns.length > 0) {
          await allBtns[allBtns.length - 1].click();
          submitClicked = true;
          log('  Clicked last button as fallback');
        }
      }

      addResult('Demo Login', 'Click submit button', submitClicked ? 'PASS' : 'FAIL');

      // Wait for navigation
      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      const postLoginUrl = page.url();
      log(`  Post-login URL: ${postLoginUrl}`);

      loginSuccess = !postLoginUrl.includes('/login');
      addResult('Demo Login', 'Login redirected away from login page', loginSuccess ? 'PASS' : 'FAIL', postLoginUrl);

      await takeScreenshot(page, '02-after-login');

    } catch (e) {
      addResult('Demo Login', 'Login process', 'FAIL', e.message);
      await takeScreenshot(page, '02-login-error');
    }

    // If not logged in, try alternative approach
    if (!loginSuccess) {
      log('\n  Trying alternative login approach...');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
      await takeScreenshot(page, '02b-login-retry');

      // Get all page content for debugging
      const pageContent = await page.locator('body').innerHTML().catch(() => '');
      const inputs = await page.locator('input').all();
      log(`  Inputs on page: ${inputs.length}`);
      for (const inp of inputs) {
        const type = await inp.getAttribute('type');
        const name = await inp.getAttribute('name');
        const placeholder = await inp.getAttribute('placeholder');
        log(`    Input: type=${type}, name=${name}, placeholder=${placeholder}`);
      }
    }

    // =========================================================
    // TEST 3: Task Pool Page - Create Task
    // =========================================================
    log('\n=== TEST: Task Pool Page ===');

    // Navigate to task pool
    const taskPoolUrls = [
      `${BASE_URL}/task-pool`,
      `${BASE_URL}/tasks`,
      `${BASE_URL}/dashboard/task-pool`,
    ];

    let taskPoolLoaded = false;
    for (const url of taskPoolUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          taskPoolLoaded = true;
          log(`  Task pool at: ${currentUrl}`);
          break;
        }
      } catch (e) {}
    }

    if (!taskPoolLoaded) {
      // Try to find task pool link in navigation
      const navLinks = await page.locator('nav a, [role="navigation"] a, .sidebar a').all();
      for (const link of navLinks) {
        const text = await link.textContent().catch(() => '');
        const href = await link.getAttribute('href').catch(() => '');
        if (text.includes('任務') || text.includes('Task') || href.includes('task')) {
          await link.click();
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          const currentUrl = page.url();
          if (!currentUrl.includes('/login')) {
            taskPoolLoaded = true;
            log(`  Navigated to task pool via nav link: ${currentUrl}`);
            break;
          }
        }
      }
    }

    await takeScreenshot(page, '03-task-pool');
    addResult('Task Pool', 'Navigate to task pool', taskPoolLoaded ? 'PASS' : 'FAIL', page.url());

    // Look for Create Task button
    if (taskPoolLoaded) {
      const createBtnSelectors = [
        'button:has-text("建立任務")',
        'button:has-text("新增任務")',
        'button:has-text("Create Task")',
        'button:has-text("新增")',
        '[data-testid="create-task"]',
        'button.btn-primary',
      ];

      let createBtnFound = false;
      for (const sel of createBtnSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          const text = await el.textContent().catch(() => '');
          addResult('Task Pool', `Find "建立任務" button`, 'PASS', `Found: "${text.trim()}" with ${sel}`);

          // Click the create button
          await el.click();
          createBtnFound = true;
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          await takeScreenshot(page, '04-create-task-modal');
          break;
        }
      }

      if (!createBtnFound) {
        // List all buttons for debugging
        const allBtns = await page.locator('button').all();
        const btnTextList = [];
        for (const btn of allBtns) {
          const t = await btn.textContent().catch(() => '');
          btnTextList.push(t.trim());
        }
        addResult('Task Pool', 'Find "建立任務" button', 'FAIL', `Available buttons: ${btnTextList.join(', ')}`);
      } else {
        // =========================================================
        // TEST 4: Fill Create Task Form
        // =========================================================
        log('\n=== TEST: Create Task Form ===');

        // Fill title
        const titleSelectors = [
          'input[placeholder*="標題"]',
          'input[placeholder*="任務名稱"]',
          'input[placeholder*="title"]',
          'input[name="title"]',
          'input[name="name"]',
          'input.input:first-of-type',
          'input[type="text"]:first-of-type',
        ];

        let titleFilled = false;
        for (const sel of titleSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible().catch(() => false)) {
            await el.fill('QA自動化測試任務');
            titleFilled = true;
            log(`  Filled title with selector: ${sel}`);
            break;
          }
        }
        addResult('Create Task Form', 'Fill title', titleFilled ? 'PASS' : 'FAIL');

        // Fill description
        const descSelectors = [
          'textarea[placeholder*="描述"]',
          'textarea[placeholder*="說明"]',
          'textarea[name="description"]',
          'textarea.input',
          'textarea',
        ];

        let descFilled = false;
        for (const sel of descSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible().catch(() => false)) {
            await el.fill('這是一個自動化QA測試建立的任務');
            descFilled = true;
            log(`  Filled description with selector: ${sel}`);
            break;
          }
        }
        addResult('Create Task Form', 'Fill description', descFilled ? 'PASS' : 'FAIL');

        // Try to select a project if available
        const projectSelectors = [
          'select[name="project"]',
          '[placeholder*="專案"]',
          '.project-select',
          'select',
        ];

        let projectSelected = false;
        for (const sel of projectSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible().catch(() => false)) {
            const tagName = await el.evaluate(e => e.tagName);
            if (tagName === 'SELECT') {
              const options = await el.locator('option').all();
              if (options.length > 1) {
                await el.selectOption({ index: 1 });
                projectSelected = true;
                log(`  Selected project option`);
              }
            } else {
              await el.click();
              await page.waitForTimeout(500);
              const dropdown = await page.locator('[role="option"], .dropdown-option').first();
              if (await dropdown.isVisible().catch(() => false)) {
                await dropdown.click();
                projectSelected = true;
              }
            }
            if (projectSelected) break;
          }
        }
        addResult('Create Task Form', 'Select project', projectSelected ? 'PASS' : 'INFO', projectSelected ? '' : 'No project selector found or no options');

        await takeScreenshot(page, '04b-create-task-filled');

        // Submit the form
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("建立")',
          'button:has-text("確認")',
          'button:has-text("新增")',
          'button:has-text("儲存")',
          'button:has-text("Submit")',
          'button:has-text("Create")',
        ];

        let submitted = false;
        for (const sel of submitSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible().catch(() => false)) {
            const text = await el.textContent().catch(() => '');
            log(`  Clicking submit button: "${text.trim()}" (${sel})`);
            await el.click();
            submitted = true;
            break;
          }
        }

        if (submitted) {
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(2000);
          await takeScreenshot(page, '05-after-create-task');

          // Check for success/error messages
          const successMsg = await page.locator('[role="alert"], .toast, .notification, .success').first();
          const successVisible = await successMsg.isVisible().catch(() => false);

          const errorMsg = await page.locator('.error, [class*="error"], [class*="Error"]').first();
          const errorVisible = await errorMsg.isVisible().catch(() => false);

          if (successVisible) {
            const msgText = await successMsg.textContent().catch(() => '');
            addResult('Create Task Form', 'Submit and create task', 'PASS', `Success: ${msgText.trim()}`);
          } else if (errorVisible) {
            const msgText = await errorMsg.textContent().catch(() => '');
            addResult('Create Task Form', 'Submit and create task', 'FAIL', `Error: ${msgText.trim()}`);
          } else {
            // Check if modal closed (task created successfully)
            const modal = await page.locator('[role="dialog"], .modal').first();
            const modalVisible = await modal.isVisible().catch(() => false);
            addResult('Create Task Form', 'Submit and create task', !modalVisible ? 'PASS' : 'UNKNOWN', !modalVisible ? 'Modal closed' : 'Modal still open');
          }
        } else {
          addResult('Create Task Form', 'Submit form', 'FAIL', 'Submit button not found');
        }
      }
    }

    // =========================================================
    // TEST 5: My Tasks Page
    // =========================================================
    log('\n=== TEST: My Tasks Page (我的任務) ===');

    const myTasksUrls = [
      `${BASE_URL}/my-tasks`,
      `${BASE_URL}/tasks/my`,
      `${BASE_URL}/dashboard/my-tasks`,
    ];

    let myTasksLoaded = false;
    for (const url of myTasksUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          myTasksLoaded = true;
          log(`  My tasks at: ${currentUrl}`);
          break;
        }
      } catch (e) {}
    }

    if (!myTasksLoaded) {
      // Try to find "我的任務" in navigation
      const navLinks = await page.locator('nav a, [role="navigation"] a, .sidebar a, a').all();
      for (const link of navLinks) {
        const text = await link.textContent().catch(() => '');
        if (text.includes('我的任務') || text.includes('My Task')) {
          await link.click();
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          myTasksLoaded = true;
          log(`  Navigated to My Tasks via: "${text.trim()}"`);
          break;
        }
      }
    }

    await takeScreenshot(page, '06-my-tasks');
    addResult('My Tasks', 'Navigate to My Tasks', myTasksLoaded ? 'PASS' : 'FAIL', page.url());

    if (myTasksLoaded) {
      // Test all visible buttons
      const buttons = await page.locator('button:visible').all();
      log(`  Found ${buttons.length} visible buttons`);

      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const btn = buttons[i];
        const text = await btn.textContent().catch(() => '');
        const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
        addResult('My Tasks', `Button: "${text.trim() || ariaLabel || 'icon-btn'}"`, 'INFO', 'Found and visible');
      }

      // Test filter buttons if present
      const filterSelectors = [
        'button:has-text("全部")',
        'button:has-text("進行中")',
        'button:has-text("待處理")',
        'button:has-text("已完成")',
        '[role="tab"]',
        '.filter-btn',
      ];

      for (const sel of filterSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          const text = await el.textContent().catch(() => '');
          await el.click();
          await page.waitForTimeout(500);
          addResult('My Tasks', `Filter click: "${text.trim()}"`, 'PASS');
        }
      }

      await takeScreenshot(page, '06b-my-tasks-tested');
    }

    // =========================================================
    // TEST 6: Gantt Chart Page
    // =========================================================
    log('\n=== TEST: Gantt Chart Page ===');

    const ganttUrls = [
      `${BASE_URL}/gantt`,
      `${BASE_URL}/dashboard/gantt`,
      `${BASE_URL}/timeline`,
    ];

    let ganttLoaded = false;
    for (const url of ganttUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          ganttLoaded = true;
          log(`  Gantt at: ${currentUrl}`);
          break;
        }
      } catch (e) {}
    }

    if (!ganttLoaded) {
      // Try to find Gantt link in navigation
      const navLinks = await page.locator('nav a, .sidebar a, a').all();
      for (const link of navLinks) {
        const text = await link.textContent().catch(() => '');
        const href = await link.getAttribute('href').catch(() => '');
        if (text.includes('甘特') || text.includes('Gantt') || text.includes('時程') || href.includes('gantt')) {
          await link.click();
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          ganttLoaded = true;
          log(`  Navigated to Gantt via: "${text.trim()}"`);
          break;
        }
      }
    }

    await takeScreenshot(page, '07-gantt');
    addResult('Gantt Chart', 'Navigate to Gantt', ganttLoaded ? 'PASS' : 'FAIL', page.url());

    if (ganttLoaded) {
      // Check for Gantt chart elements
      const ganttSelectors = [
        '.gantt',
        '[class*="gantt"]',
        'svg',
        'canvas',
        '.chart',
        '[class*="chart"]',
      ];

      let ganttRendered = false;
      for (const sel of ganttSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          addResult('Gantt Chart', `Gantt element rendered (${sel})`, 'PASS');
          ganttRendered = true;
          break;
        }
      }

      if (!ganttRendered) {
        addResult('Gantt Chart', 'Gantt chart rendered', 'FAIL', 'No chart element found');
      }

      // Test Gantt buttons
      const ganttBtns = await page.locator('button:visible').all();
      log(`  Found ${ganttBtns.length} visible buttons in Gantt`);
      for (let i = 0; i < Math.min(ganttBtns.length, 5); i++) {
        const text = await ganttBtns[i].textContent().catch(() => '');
        addResult('Gantt Chart', `Button: "${text.trim()}"`, 'INFO', 'Found and visible');
      }

      await takeScreenshot(page, '07b-gantt-tested');
    }

    // =========================================================
    // TEST 7: Navigation Links
    // =========================================================
    log('\n=== TEST: Navigation Links ===');

    // Go to main page and test nav
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    log(`  Main URL after navigation: ${currentUrl}`);

    await takeScreenshot(page, '08-main-page');

    const navLinks = await page.locator('nav a, .sidebar a, [role="navigation"] a').all();
    log(`  Found ${navLinks.length} navigation links`);

    for (const link of navLinks) {
      const text = await link.textContent().catch(() => '');
      const href = await link.getAttribute('href').catch(() => '');
      addResult('Navigation', `Nav link: "${text.trim()}"`, 'INFO', `href: ${href}`);
    }

    // =========================================================
    // CONSOLE ERROR SUMMARY
    // =========================================================
    log('\n=== Console Errors Summary ===');
    if (consoleErrors.length === 0) {
      addResult('Console', 'No JavaScript errors', 'PASS');
      log('  No console errors found');
    } else {
      log(`  Found ${consoleErrors.length} console errors:`);
      for (const err of consoleErrors.slice(0, 10)) {
        addResult('Console', 'JavaScript error', 'FAIL', err.substring(0, 200));
        log(`  ERROR: ${err.substring(0, 200)}`);
      }
    }

    // =========================================================
    // NETWORK ERROR SUMMARY
    // =========================================================
    log('\n=== Network Errors Summary ===');
    if (networkErrors.length === 0) {
      addResult('Network', 'No network errors', 'PASS');
    } else {
      log(`  Found ${networkErrors.length} network errors`);
      for (const err of networkErrors.slice(0, 5)) {
        addResult('Network', 'Request failed', 'FAIL', `${err.url} - ${err.reason}`);
        log(`  FAIL: ${err.url} - ${err.reason}`);
      }
    }

  } catch (e) {
    log(`FATAL ERROR: ${e.message}`);
    await takeScreenshot(page, 'error-fatal');
  } finally {
    await browser.close();
  }

  // =========================================================
  // FINAL REPORT
  // =========================================================
  log('\n\n========================================');
  log('QA TEST REPORT - ProgressHub Production');
  log('========================================');

  const passes = RESULTS.filter(r => r.result === 'PASS').length;
  const fails = RESULTS.filter(r => r.result === 'FAIL').length;
  const infos = RESULTS.filter(r => r.result === 'INFO').length;
  const unknowns = RESULTS.filter(r => r.result === 'UNKNOWN').length;

  log(`\nSummary: PASS=${passes}, FAIL=${fails}, INFO=${infos}, UNKNOWN=${unknowns}`);
  log(`Total Tests: ${RESULTS.length}`);

  // Group by page
  const pages = [...new Set(RESULTS.map(r => r.page))];
  for (const pageName of pages) {
    log(`\n--- ${pageName} ---`);
    const pageResults = RESULTS.filter(r => r.page === pageName);
    for (const r of pageResults) {
      const icon = r.result === 'PASS' ? '✓' : r.result === 'FAIL' ? '✗' : 'i';
      log(`  ${icon} [${r.result}] ${r.action}${r.details ? ': ' + r.details : ''}`);
    }
  }

  // Save report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    target: BASE_URL,
    summary: { passes, fails, infos, unknowns, total: RESULTS.length },
    results: RESULTS,
    consoleErrors,
    networkErrors,
  };

  const reportPath = '/Users/admin/progresshub_claude/qa-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  log(`\nFull report saved to: ${reportPath}`);
  log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  return { passes, fails, results: RESULTS };
}

runTests().catch(console.error);
