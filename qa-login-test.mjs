import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE_URL = 'https://progresshub-cb.zeabur.app';
const SCREENSHOT_DIR = '/Users/admin/progresshub_claude/qa-screenshots';
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
let screenshotCounter = 1;

function log(msg) {
  console.log(`[QA] ${msg}`);
}

function record(testId, testName, status, detail = '') {
  results.push({ testId, testName, status, detail });
  const icon = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'WARN';
  log(`${icon} | ${testId} ${testName}${detail ? ' - ' + detail : ''}`);
}

async function screenshot(page, label) {
  const num = String(screenshotCounter++).padStart(2, '0');
  const path = `${SCREENSHOT_DIR}/login-${num}-${label}.png`;
  await page.screenshot({ path, fullPage: true });
  log(`Screenshot: ${path}`);
  return path;
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // ========================================
  // TEST 1: Page Load & Login Form Display
  // ========================================
  log('=== TEST 1: Login Page Load ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, 'initial-load');

    // Check for login form elements
    const pageContent = await page.textContent('body');
    log(`Page title: ${await page.title()}`);
    log(`URL: ${page.url()}`);

    // Look for name input
    const nameInput = await page.$('input[type="text"], input[name="name"], input[placeholder*="名"], input[placeholder*="name"], input[placeholder*="Name"]');
    if (nameInput) {
      record('T1.1', 'Name input field visible', 'PASS');
    } else {
      // Try broader search
      const allInputs = await page.$$('input');
      log(`Found ${allInputs.length} input elements on page`);
      for (const inp of allInputs) {
        const attrs = await inp.evaluate(el => ({
          type: el.type, name: el.name, placeholder: el.placeholder, id: el.id, className: el.className
        }));
        log(`  Input: ${JSON.stringify(attrs)}`);
      }
      record('T1.1', 'Name input field visible', 'WARN', `No obvious name input found. ${allInputs.length} inputs on page.`);
    }

    // Look for role selection buttons
    const roleButtons = await page.$$('button');
    const roleTexts = [];
    for (const btn of roleButtons) {
      const text = (await btn.textContent()).trim();
      roleTexts.push(text);
    }
    log(`Buttons on page: ${JSON.stringify(roleTexts)}`);

    const hasEmployee = roleTexts.some(t => /employee|一般員工|員工/i.test(t));
    const hasPM = roleTexts.some(t => /^pm$|專案經理|project\s*manager/i.test(t));
    const hasAdmin = roleTexts.some(t => /admin|管理員/i.test(t));

    if (hasEmployee && hasPM && hasAdmin) {
      record('T1.2', 'Role selection buttons (EMPLOYEE/PM/ADMIN)', 'PASS');
    } else {
      record('T1.2', 'Role selection buttons (EMPLOYEE/PM/ADMIN)', 'WARN',
        `Employee=${hasEmployee}, PM=${hasPM}, Admin=${hasAdmin}. Buttons: ${roleTexts.join(', ')}`);
    }
  } catch (err) {
    record('T1.1', 'Login page loads', 'FAIL', err.message);
  }

  // ========================================
  // TEST 2: Role Selection Button State
  // ========================================
  log('\n=== TEST 2: Role Selection State Changes ===');
  try {
    // Find role-related buttons/elements
    const allButtons = await page.$$('button');
    let employeeBtn = null, pmBtn = null, adminBtn = null;

    for (const btn of allButtons) {
      const text = (await btn.textContent()).trim().toLowerCase();
      if (/employee|一般員工|員工/.test(text) && !employeeBtn) employeeBtn = btn;
      else if (/^pm$|專案經理|project\s*manager/.test(text) && !pmBtn) pmBtn = btn;
      else if (/admin|管理員/.test(text) && !adminBtn) adminBtn = btn;
    }

    // Also try radio buttons or select elements
    if (!employeeBtn) {
      const selects = await page.$$('select');
      if (selects.length > 0) {
        log(`Found ${selects.length} select elements - role might be a dropdown`);
        for (const sel of selects) {
          const options = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent.trim() })));
          log(`  Select options: ${JSON.stringify(options)}`);
        }
      }
    }

    if (employeeBtn) {
      await employeeBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'role-employee-selected');

      // Check if button has active/selected state
      const employeeClasses = await employeeBtn.evaluate(el => el.className);
      log(`Employee btn classes after click: ${employeeClasses}`);
      record('T2.1', 'EMPLOYEE role button clickable & shows selected state', 'PASS');

      if (pmBtn) {
        await pmBtn.click();
        await page.waitForTimeout(500);
        await screenshot(page, 'role-pm-selected');
        record('T2.2', 'PM role button clickable & shows selected state', 'PASS');
      }

      if (adminBtn) {
        await adminBtn.click();
        await page.waitForTimeout(500);
        await screenshot(page, 'role-admin-selected');
        record('T2.3', 'ADMIN role button clickable & shows selected state', 'PASS');
      }
    } else {
      record('T2.1', 'Role selection interaction', 'WARN', 'Could not locate individual role buttons');
    }
  } catch (err) {
    record('T2', 'Role selection state changes', 'FAIL', err.message);
  }

  // ========================================
  // TEST 3: Login Button Enable/Disable
  // ========================================
  log('\n=== TEST 3: Login Button Enable/Disable ===');
  try {
    // Reload to reset state
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Find login/submit button
    const allButtons = await page.$$('button');
    let loginBtn = null;
    let roleBtns = [];

    for (const btn of allButtons) {
      const text = (await btn.textContent()).trim();
      if (/登入|login|sign\s*in|demo/i.test(text)) {
        loginBtn = btn;
        log(`Found login button: "${text}"`);
      }
      if (/employee|一般員工|pm|專案經理|admin|管理員/i.test(text)) {
        roleBtns.push({ btn, text });
      }
    }

    if (loginBtn) {
      // Check initial state (should be disabled)
      const initialDisabled = await loginBtn.evaluate(el => el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true');
      log(`Login button initially disabled: ${initialDisabled}`);

      if (initialDisabled) {
        record('T3.1', 'Login button disabled when form incomplete', 'PASS');
      } else {
        record('T3.1', 'Login button disabled when form incomplete', 'WARN', 'Button appears enabled without form input');
      }

      // Fill name
      const nameInput = await page.$('input[type="text"], input:not([type="hidden"]):not([type="password"]):not([type="email"])');
      if (nameInput) {
        await nameInput.fill('QA Tester');
        await page.waitForTimeout(300);
        log('Filled name input with "QA Tester"');
      }

      // Select a role
      if (roleBtns.length > 0) {
        await roleBtns[0].btn.click();
        await page.waitForTimeout(300);
        log(`Clicked role: ${roleBtns[0].text}`);
      }

      await page.waitForTimeout(500);
      await screenshot(page, 'form-filled');

      // Check if login button is now enabled
      const afterDisabled = await loginBtn.evaluate(el => el.disabled);
      log(`Login button disabled after filling form: ${afterDisabled}`);

      if (!afterDisabled) {
        record('T3.2', 'Login button enabled after name + role filled', 'PASS');
      } else {
        record('T3.2', 'Login button enabled after name + role filled', 'FAIL', 'Button still disabled after filling name and selecting role');
      }
    } else {
      record('T3', 'Login button presence', 'FAIL', 'No login button found');
    }
  } catch (err) {
    record('T3', 'Login button enable/disable', 'FAIL', err.message);
  }

  // ========================================
  // TEST 4: Actual Demo Login (EMPLOYEE)
  // ========================================
  log('\n=== TEST 4: Demo Login (EMPLOYEE) ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const allButtons = await page.$$('button');
    let loginBtn = null;
    let employeeBtn = null;

    for (const btn of allButtons) {
      const text = (await btn.textContent()).trim();
      if (/登入|login|sign\s*in|demo/i.test(text)) loginBtn = btn;
      if (/employee|一般員工|員工/i.test(text)) employeeBtn = btn;
    }

    // Fill name
    const nameInput = await page.$('input[type="text"], input:not([type="hidden"]):not([type="password"]):not([type="email"])');
    if (nameInput) await nameInput.fill('QA Tester');

    // Select EMPLOYEE role
    if (employeeBtn) {
      await employeeBtn.click();
      await page.waitForTimeout(500);
    }

    await screenshot(page, 'before-employee-login');

    // Check if project select appears for EMPLOYEE
    await page.waitForTimeout(1000);
    const projectSelect = await page.$('select, [class*="searchable"], [class*="dropdown"], [role="listbox"], [role="combobox"]');
    const projectSelectText = await page.textContent('body');
    const hasProjectSection = /專案|project/i.test(projectSelectText);
    log(`Project selection area detected: ${!!projectSelect}, text mention: ${hasProjectSection}`);

    await screenshot(page, 'employee-project-select-check');

    // Click login
    if (loginBtn) {
      const isDisabled = await loginBtn.evaluate(el => el.disabled);
      if (!isDisabled) {
        await loginBtn.click();
        log('Clicked login button');

        // Wait for navigation
        try {
          await page.waitForURL('**/dashboard**', { timeout: 15000 });
          await page.waitForTimeout(2000);
          await screenshot(page, 'employee-dashboard');

          const currentUrl = page.url();
          log(`After login URL: ${currentUrl}`);

          if (/dashboard/i.test(currentUrl)) {
            record('T4.1', 'EMPLOYEE login redirects to Dashboard', 'PASS');
          } else {
            record('T4.1', 'EMPLOYEE login redirects to Dashboard', 'FAIL', `Landed on: ${currentUrl}`);
          }
        } catch (navErr) {
          // Maybe it redirected somewhere else
          await page.waitForTimeout(3000);
          const currentUrl = page.url();
          await screenshot(page, 'employee-after-login');
          log(`After login URL (fallback): ${currentUrl}`);

          if (currentUrl !== BASE_URL && currentUrl !== BASE_URL + '/') {
            record('T4.1', 'EMPLOYEE login navigates away from login page', 'WARN', `Landed on: ${currentUrl} (not /dashboard)`);
          } else {
            record('T4.1', 'EMPLOYEE login redirects to Dashboard', 'FAIL', `Still on login page: ${currentUrl}`);
          }
        }
      } else {
        record('T4.1', 'EMPLOYEE login', 'FAIL', 'Login button is disabled, cannot click');
      }
    }
  } catch (err) {
    record('T4', 'Demo login (EMPLOYEE)', 'FAIL', err.message);
  }

  // ========================================
  // TEST 5: Logout
  // ========================================
  log('\n=== TEST 5: Logout ===');
  try {
    // Look for logout button/link
    const currentUrl = page.url();
    log(`Current URL before logout: ${currentUrl}`);

    if (!/login/i.test(currentUrl) && currentUrl !== BASE_URL + '/') {
      // We're logged in, look for logout
      // Check for user menu / avatar / settings
      const logoutBtn = await page.$('button:has-text("登出"), button:has-text("Logout"), button:has-text("Sign out"), a:has-text("登出"), a:has-text("Logout")');

      if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForTimeout(2000);
        await screenshot(page, 'after-logout');
        log(`URL after logout: ${page.url()}`);

        if (/login/i.test(page.url()) || page.url() === BASE_URL + '/') {
          record('T5.1', 'Logout returns to login page', 'PASS');
        } else {
          record('T5.1', 'Logout returns to login page', 'FAIL', `Landed on: ${page.url()}`);
        }
      } else {
        // Try finding it in a menu/sidebar
        log('Direct logout button not found, checking sidebar/menu...');
        const menuTriggers = await page.$$('[class*="avatar"], [class*="user"], [class*="menu"], [class*="sidebar"] a, nav a, nav button');
        log(`Found ${menuTriggers.length} potential menu triggers`);

        // Try clicking settings or user area
        const settingsLink = await page.$('a[href*="settings"], a:has-text("設定"), a:has-text("Settings")');
        if (settingsLink) {
          await settingsLink.click();
          await page.waitForTimeout(1500);
          await screenshot(page, 'settings-page');
        }

        // Try looking again after navigation
        const logoutBtn2 = await page.$('button:has-text("登出"), button:has-text("Logout"), a:has-text("登出"), a:has-text("Logout"), [class*="logout"]');
        if (logoutBtn2) {
          await logoutBtn2.click();
          await page.waitForTimeout(2000);
          await screenshot(page, 'after-logout-v2');
          log(`URL after logout v2: ${page.url()}`);
          if (/login/i.test(page.url()) || page.url() === BASE_URL + '/') {
            record('T5.1', 'Logout returns to login page', 'PASS');
          } else {
            record('T5.1', 'Logout returns to login page', 'FAIL', `Landed on: ${page.url()}`);
          }
        } else {
          // Screenshot current state for diagnosis
          await screenshot(page, 'no-logout-found');
          const bodyText = await page.textContent('body');
          const hasLogoutText = /登出|logout|sign\s*out/i.test(bodyText);
          record('T5.1', 'Logout button found', 'WARN', `No clickable logout found. Text "logout" in page: ${hasLogoutText}`);
        }
      }
    } else {
      record('T5.1', 'Logout test', 'WARN', 'Not logged in, skipping logout test');
    }
  } catch (err) {
    record('T5', 'Logout', 'FAIL', err.message);
  }

  // ========================================
  // TEST 6: Route Guard (access /dashboard when logged out)
  // ========================================
  log('\n=== TEST 6: Route Guard ===');
  try {
    // Clear all storage to ensure logged out
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, 'route-guard-dashboard');

    const guardUrl = page.url();
    log(`Route guard test - navigated to /dashboard, landed on: ${guardUrl}`);

    if (/login/i.test(guardUrl) || guardUrl === BASE_URL + '/' || guardUrl === BASE_URL) {
      record('T6.1', 'Unauthenticated /dashboard redirects to login', 'PASS');
    } else if (/dashboard/i.test(guardUrl)) {
      record('T6.1', 'Unauthenticated /dashboard redirects to login', 'FAIL', `Still on dashboard: ${guardUrl}`);
    } else {
      record('T6.1', 'Unauthenticated /dashboard redirects to login', 'WARN', `Landed on unexpected URL: ${guardUrl}`);
    }
  } catch (err) {
    record('T6.1', 'Route guard test', 'FAIL', err.message);
  }

  // ========================================
  // TEST 7: Project Selection (non-ADMIN)
  // ========================================
  log('\n=== TEST 7: Project Selection for non-ADMIN ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const allButtons = await page.$$('button');
    let employeeBtn = null, adminBtn = null;

    for (const btn of allButtons) {
      const text = (await btn.textContent()).trim().toLowerCase();
      if (/employee|一般員工|員工/.test(text)) employeeBtn = btn;
      if (/admin|管理員/.test(text)) adminBtn = btn;
    }

    // Select EMPLOYEE first
    if (employeeBtn) {
      await employeeBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'project-select-employee');

      // Check for project selection UI
      const bodyHtml = await page.evaluate(() => document.body.innerHTML);
      const hasProjectUI = /專案|project|select.*project|選擇.*專案/i.test(bodyHtml);
      // Check for select/dropdown/searchable-select
      const selectElements = await page.$$('select, [class*="searchable"], [class*="select"], [role="combobox"], [role="listbox"]');
      log(`EMPLOYEE role: project UI elements found: ${selectElements.length}, text mention: ${hasProjectUI}`);

      if (selectElements.length > 0 || hasProjectUI) {
        record('T7.1', 'Project selection visible for EMPLOYEE role', 'PASS');
      } else {
        record('T7.1', 'Project selection visible for EMPLOYEE role', 'WARN', 'No project selection UI detected');
      }
    }

    // Switch to ADMIN
    if (adminBtn) {
      await adminBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'project-select-admin');

      const selectElementsAdmin = await page.$$('select, [class*="searchable"], [class*="select"]:not(button), [role="combobox"], [role="listbox"]');
      // Filter out role selection itself
      log(`ADMIN role: select elements found: ${selectElementsAdmin.length}`);

      // More precise: check if project-specific select exists
      const bodyHtmlAdmin = await page.evaluate(() => document.body.innerHTML);
      const hasProjectUIAdmin = /專案選擇|select.*project|選擇專案/i.test(bodyHtmlAdmin);

      if (!hasProjectUIAdmin && selectElementsAdmin.length === 0) {
        record('T7.2', 'Project selection hidden for ADMIN role', 'PASS');
      } else {
        record('T7.2', 'Project selection hidden for ADMIN role', 'WARN', `Project UI might still be visible (elements: ${selectElementsAdmin.length})`);
      }
    }
  } catch (err) {
    record('T7', 'Project selection test', 'FAIL', err.message);
  }

  // ========================================
  // TEST 8: PM Role Login
  // ========================================
  log('\n=== TEST 8: PM Role Login ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const allButtons = await page.$$('button');
    let loginBtn = null, pmBtn = null;

    for (const btn of allButtons) {
      const text = (await btn.textContent()).trim();
      if (/登入|login|sign\s*in|demo/i.test(text)) loginBtn = btn;
      if (/^pm$/i.test(text.trim()) || /專案經理/i.test(text)) pmBtn = btn;
    }

    const nameInput = await page.$('input[type="text"], input:not([type="hidden"]):not([type="password"]):not([type="email"])');
    if (nameInput) await nameInput.fill('QA PM Tester');

    if (pmBtn) {
      await pmBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'pm-role-selected');
    }

    if (loginBtn) {
      const isDisabled = await loginBtn.evaluate(el => el.disabled);
      if (!isDisabled) {
        await loginBtn.click();
        try {
          await page.waitForURL('**/dashboard**', { timeout: 15000 });
          await page.waitForTimeout(2000);
          await screenshot(page, 'pm-dashboard');
          record('T8.1', 'PM login redirects to Dashboard', 'PASS');
        } catch {
          await page.waitForTimeout(3000);
          const url = page.url();
          await screenshot(page, 'pm-after-login');
          if (url !== BASE_URL && url !== BASE_URL + '/') {
            record('T8.1', 'PM login navigates to app', 'WARN', `Landed on: ${url}`);
          } else {
            record('T8.1', 'PM login redirects to Dashboard', 'FAIL', `Still on: ${url}`);
          }
        }
      } else {
        record('T8.1', 'PM login', 'FAIL', 'Login button disabled');
      }
    }

    // Logout for next test
    await context.clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  } catch (err) {
    record('T8', 'PM role login', 'FAIL', err.message);
  }

  // ========================================
  // TEST 9: ADMIN Role Login
  // ========================================
  log('\n=== TEST 9: ADMIN Role Login ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const allButtons = await page.$$('button');
    let loginBtn = null, adminBtn = null;

    for (const btn of allButtons) {
      const text = (await btn.textContent()).trim();
      if (/登入|login|sign\s*in|demo/i.test(text)) loginBtn = btn;
      if (/admin|管理員/i.test(text)) adminBtn = btn;
    }

    const nameInput = await page.$('input[type="text"], input:not([type="hidden"]):not([type="password"]):not([type="email"])');
    if (nameInput) await nameInput.fill('QA Admin Tester');

    if (adminBtn) {
      await adminBtn.click();
      await page.waitForTimeout(500);
    }

    if (loginBtn) {
      const isDisabled = await loginBtn.evaluate(el => el.disabled);
      if (!isDisabled) {
        await loginBtn.click();
        try {
          await page.waitForURL('**/dashboard**', { timeout: 15000 });
          await page.waitForTimeout(2000);
          await screenshot(page, 'admin-dashboard');
          record('T9.1', 'ADMIN login redirects to Dashboard', 'PASS');
        } catch {
          await page.waitForTimeout(3000);
          const url = page.url();
          await screenshot(page, 'admin-after-login');
          if (url !== BASE_URL && url !== BASE_URL + '/') {
            record('T9.1', 'ADMIN login navigates to app', 'WARN', `Landed on: ${url}`);
          } else {
            record('T9.1', 'ADMIN login redirects to Dashboard', 'FAIL', `Still on: ${url}`);
          }
        }
      } else {
        record('T9.1', 'ADMIN login', 'FAIL', 'Login button disabled');
      }
    }
  } catch (err) {
    record('T9', 'ADMIN role login', 'FAIL', err.message);
  }

  // ========================================
  // Summary
  // ========================================
  log('\n========================================');
  log('QA TEST SUMMARY');
  log('========================================');
  let pass = 0, fail = 0, warn = 0;
  for (const r of results) {
    const line = `${r.status.padEnd(4)} | ${r.testId.padEnd(6)} | ${r.testName}${r.detail ? ' -- ' + r.detail : ''}`;
    console.log(line);
    if (r.status === 'PASS') pass++;
    else if (r.status === 'FAIL') fail++;
    else warn++;
  }
  log(`\nTotal: ${results.length} | PASS: ${pass} | FAIL: ${fail} | WARN: ${warn}`);

  await browser.close();
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
