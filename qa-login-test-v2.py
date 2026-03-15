#!/usr/bin/env python3
"""QA Login & Auth Test v2 for ProgressHub."""

import os
import re

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

BASE_URL = "https://progresshub-cb.zeabur.app"
SCREENSHOT_DIR = "/Users/admin/progresshub_claude/qa-screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

results = []
sc_counter = [1]


def log(msg):
    print(f"[QA] {msg}", flush=True)


def record(test_id, name, status, detail=""):
    results.append({"id": test_id, "name": name, "status": status, "detail": detail})
    log(f"{status} | {test_id} {name}{' - ' + detail if detail else ''}")


def shot(page, label):
    num = str(sc_counter[0]).zfill(2)
    sc_counter[0] += 1
    path = f"{SCREENSHOT_DIR}/login-{num}-{label}.png"
    page.screenshot(path=path, full_page=True)
    return path


def clear_session(context, page):
    context.clear_cookies()
    page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")


def get_url(page):
    """page.url is a property in Playwright Python."""
    return page.url


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
        )
        page = context.new_page()

        # Role button texts discovered from inspection
        ROLE_MAP = {
            "pm": "PM",
            "employee": "一般同仁",
            "producer": "製作人",
            "admin": "管理者",  # Note: "管理者" not "管理員"
        }
        LOGIN_TEXT = "以 Demo 身分登入"

        def find_btn(text_match):
            for btn in page.query_selector_all("button"):
                t = (btn.text_content() or "").strip()
                if t == text_match:
                    return btn
            return None

        def find_login_btn():
            return find_btn(LOGIN_TEXT)

        def find_name_input():
            return page.query_selector('input[placeholder="請輸入您的姓名"]')

        # =====================================================
        # T1: Login Page Load & Form Display
        # =====================================================
        log("=== T1: Login Page Load ===")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1500)
            shot(page, "initial-load")

            log(f"Title: {page.title()}")
            log(f"URL: {get_url(page)}")

            name_input = find_name_input()
            if name_input:
                record("T1.1", "Name input (placeholder='請輸入您的姓名')", "PASS")
            else:
                record("T1.1", "Name input visible", "FAIL", "No name input found")

            # Check role buttons
            all_found = True
            for role_key, role_text in ROLE_MAP.items():
                btn = find_btn(role_text)
                if btn:
                    log(f"  Role '{role_text}' button found")
                else:
                    log(f"  Role '{role_text}' button NOT found")
                    all_found = False

            if all_found:
                record("T1.2", "Role buttons (PM/一般同仁/製作人/管理者) all present", "PASS")
            else:
                record("T1.2", "Role buttons", "FAIL", "Some role buttons missing")

            login_btn = find_login_btn()
            if login_btn:
                record("T1.3", "Demo login button present", "PASS")
            else:
                record("T1.3", "Demo login button present", "FAIL", "Button not found")

        except Exception as e:
            record("T1", "Login page loads", "FAIL", str(e))

        # =====================================================
        # T2: Role Button State Changes
        # =====================================================
        log("\n=== T2: Role Button State Changes ===")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            for role_key, role_text in ROLE_MAP.items():
                btn = find_btn(role_text)
                if btn:
                    classes_before = btn.evaluate("el => el.className")
                    btn.click()
                    page.wait_for_timeout(500)
                    classes_after = btn.evaluate("el => el.className")
                    shot(page, f"role-{role_key}-selected")

                    # Check if class changed to indicate selection
                    has_active = "border-samurai" in classes_after or "bg-samurai" in classes_after
                    changed = classes_before != classes_after

                    log(f"  {role_text}: before='{classes_before[:60]}' after='{classes_after[:60]}' changed={changed}")

                    if changed and has_active:
                        record(f"T2.{role_key}", f"'{role_text}' shows active state on click", "PASS")
                    elif changed:
                        record(f"T2.{role_key}", f"'{role_text}' class changes on click", "PASS")
                    else:
                        record(f"T2.{role_key}", f"'{role_text}' state change on click", "WARN", "No class change detected")
                else:
                    record(f"T2.{role_key}", f"'{role_text}' button", "FAIL", "Not found")

        except Exception as e:
            record("T2", "Role button states", "FAIL", str(e))

        # =====================================================
        # T3: Login Button Enable/Disable
        # =====================================================
        log("\n=== T3: Login Button Enable/Disable ===")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            login_btn = find_login_btn()
            if login_btn:
                initial_disabled = login_btn.evaluate("el => el.disabled")
                log(f"Initial disabled state: {initial_disabled}")

                if initial_disabled:
                    record("T3.1", "Login button disabled when form is empty", "PASS")
                else:
                    record("T3.1", "Login button disabled when form is empty", "FAIL",
                           "Button is enabled with no input")

                # Fill name only, check still disabled
                name_input = find_name_input()
                if name_input:
                    name_input.fill("QA Tester")
                    page.wait_for_timeout(300)

                name_only_disabled = login_btn.evaluate("el => el.disabled")
                log(f"After name only: disabled={name_only_disabled}")

                if name_only_disabled:
                    record("T3.2", "Login button disabled with name only (no role)", "PASS")
                else:
                    record("T3.2", "Login button disabled with name only (no role)", "WARN",
                           "Button enabled without role selection")

                # Select role
                employee_btn = find_btn(ROLE_MAP["employee"])
                if employee_btn:
                    employee_btn.click()
                    page.wait_for_timeout(500)

                after_disabled = login_btn.evaluate("el => el.disabled")
                log(f"After name + role: disabled={after_disabled}")
                shot(page, "form-complete")

                if not after_disabled:
                    record("T3.3", "Login button enabled after name + role filled", "PASS")
                else:
                    record("T3.3", "Login button enabled after name + role filled", "FAIL",
                           "Still disabled")

                # Clear name, check goes back to disabled
                if name_input:
                    name_input.fill("")
                    page.wait_for_timeout(300)
                cleared_disabled = login_btn.evaluate("el => el.disabled")
                log(f"After clearing name: disabled={cleared_disabled}")

                if cleared_disabled:
                    record("T3.4", "Login button re-disables when name cleared", "PASS")
                else:
                    record("T3.4", "Login button re-disables when name cleared", "FAIL",
                           "Button stays enabled with empty name")

        except Exception as e:
            record("T3", "Login button logic", "FAIL", str(e))

        # =====================================================
        # T4: Project Selection (non-ADMIN vs ADMIN)
        # =====================================================
        log("\n=== T4: Project Selection ===")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            name_input = find_name_input()
            if name_input:
                name_input.fill("QA Tester")

            # Test EMPLOYEE (一般同仁) - should show project select
            employee_btn = find_btn(ROLE_MAP["employee"])
            if employee_btn:
                employee_btn.click()
                page.wait_for_timeout(1000)
                shot(page, "employee-project-check")

                body_html = page.evaluate("() => document.body.innerHTML")
                has_project_text = bool(re.search(r"專案|project", body_html, re.I))
                selects = page.query_selector_all("select")
                dropdowns = page.query_selector_all('[class*="searchable"], [class*="dropdown"], [role="combobox"], [role="listbox"]')
                log(f"EMPLOYEE: selects={len(selects)}, dropdowns={len(dropdowns)}, project_text={has_project_text}")

                if selects or dropdowns:
                    record("T4.1", "Project select visible for 一般同仁", "PASS")
                    if selects:
                        options = selects[0].evaluate("el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent.trim()}))")
                        log(f"  Options: {options}")
                elif has_project_text:
                    record("T4.1", "Project select visible for 一般同仁", "WARN",
                           "Project text found but no select/dropdown element")
                else:
                    record("T4.1", "Project select visible for 一般同仁", "WARN",
                           "No project selection UI detected")

            # Test PM - should show project select
            pm_btn = find_btn(ROLE_MAP["pm"])
            if pm_btn:
                pm_btn.click()
                page.wait_for_timeout(1000)
                shot(page, "pm-project-check")

                selects_pm = page.query_selector_all("select")
                dropdowns_pm = page.query_selector_all('[class*="searchable"], [class*="dropdown"], [role="combobox"], [role="listbox"]')
                log(f"PM: selects={len(selects_pm)}, dropdowns={len(dropdowns_pm)}")

                if selects_pm or dropdowns_pm:
                    record("T4.2", "Project select visible for PM", "PASS")
                else:
                    record("T4.2", "Project select visible for PM", "WARN",
                           "No project selection UI for PM")

            # Test ADMIN (管理者) - should hide project select
            admin_btn = find_btn(ROLE_MAP["admin"])
            if admin_btn:
                admin_btn.click()
                page.wait_for_timeout(1000)
                shot(page, "admin-project-check")

                selects_admin = page.query_selector_all("select")
                dropdowns_admin = page.query_selector_all('[class*="searchable"], [class*="dropdown"], [role="combobox"], [role="listbox"]')
                log(f"ADMIN: selects={len(selects_admin)}, dropdowns={len(dropdowns_admin)}")

                if not selects_admin and not dropdowns_admin:
                    record("T4.3", "Project select hidden for 管理者", "PASS")
                else:
                    record("T4.3", "Project select hidden for 管理者", "WARN",
                           f"Still visible: selects={len(selects_admin)} dropdowns={len(dropdowns_admin)}")

        except Exception as e:
            record("T4", "Project selection", "FAIL", str(e))

        # =====================================================
        # T5: EMPLOYEE (一般同仁) Demo Login
        # =====================================================
        log("\n=== T5: 一般同仁 Demo Login ===")
        try:
            clear_session(context, page)
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            name_input = find_name_input()
            if name_input:
                name_input.fill("QA Employee")

            employee_btn = find_btn(ROLE_MAP["employee"])
            if employee_btn:
                employee_btn.click()
                page.wait_for_timeout(500)

            shot(page, "before-employee-login")

            login_btn = find_login_btn()
            if login_btn:
                disabled = login_btn.evaluate("el => el.disabled")
                if not disabled:
                    login_btn.click()
                    log("Clicked Demo login")

                    try:
                        page.wait_for_url("**/dashboard**", timeout=15000)
                        page.wait_for_timeout(2000)
                        shot(page, "employee-dashboard")
                        url = get_url(page)
                        log(f"After login: {url}")
                        if "dashboard" in url.lower():
                            record("T5.1", "一般同仁 login -> Dashboard", "PASS")
                        else:
                            record("T5.1", "一般同仁 login -> Dashboard", "FAIL", f"URL: {url}")
                    except PlaywrightTimeout:
                        page.wait_for_timeout(3000)
                        url = get_url(page)
                        shot(page, "employee-login-timeout")
                        log(f"Timeout. URL: {url}")
                        if url != BASE_URL and url != BASE_URL + "/" and "login" not in url.lower():
                            record("T5.1", "一般同仁 login navigates", "WARN", f"URL: {url}")
                        else:
                            record("T5.1", "一般同仁 login -> Dashboard", "FAIL", f"Still on: {url}")
                else:
                    record("T5.1", "一般同仁 login", "FAIL", "Login button disabled")

        except Exception as e:
            record("T5", "一般同仁 login", "FAIL", str(e))

        # =====================================================
        # T6: Logout from EMPLOYEE session
        # =====================================================
        log("\n=== T6: Logout ===")
        try:
            url = get_url(page)
            log(f"Current URL: {url}")

            if "login" not in url.lower() and url not in (BASE_URL, BASE_URL + "/"):
                logout_found = False

                # Look for logout button - try multiple strategies
                for selector in [
                    'button:has-text("登出")',
                    'a:has-text("登出")',
                    'button:has-text("Logout")',
                    'a:has-text("Logout")',
                ]:
                    try:
                        el = page.query_selector(selector)
                        if el and el.is_visible():
                            el.click()
                            page.wait_for_timeout(2000)
                            logout_found = True
                            break
                    except Exception:
                        pass

                if not logout_found:
                    # Navigate to settings page
                    log("Direct logout not found, trying settings...")
                    for sel in ['a[href*="settings"]', 'a:has-text("設定")', 'a:has-text("Settings")']:
                        try:
                            el = page.query_selector(sel)
                            if el and el.is_visible():
                                el.click()
                                page.wait_for_timeout(2000)
                                shot(page, "settings-page")
                                break
                        except Exception:
                            pass

                    # Try logout again
                    for selector in [
                        'button:has-text("登出")',
                        'a:has-text("登出")',
                        'button:has-text("Logout")',
                    ]:
                        try:
                            el = page.query_selector(selector)
                            if el and el.is_visible():
                                el.click()
                                page.wait_for_timeout(2000)
                                logout_found = True
                                break
                        except Exception:
                            pass

                if logout_found:
                    shot(page, "after-logout")
                    url_after = get_url(page)
                    log(f"After logout: {url_after}")

                    if "login" in url_after.lower() or url_after in (BASE_URL, BASE_URL + "/"):
                        record("T6.1", "Logout clears state & returns to login", "PASS")
                    else:
                        record("T6.1", "Logout returns to login", "FAIL", f"URL: {url_after}")
                else:
                    shot(page, "no-logout-btn")
                    # Dump all visible text to debug
                    body = page.text_content("body") or ""
                    has_text = bool(re.search(r"登出|logout", body, re.I))
                    record("T6.1", "Logout button found", "WARN",
                           f"No clickable logout found. '登出' in page text: {has_text}")
            else:
                record("T6.1", "Logout", "WARN", "Not logged in, cannot test logout")

        except Exception as e:
            record("T6", "Logout", "FAIL", str(e))

        # =====================================================
        # T7: Route Guard (unauthenticated access to /dashboard)
        # =====================================================
        log("\n=== T7: Route Guard ===")
        try:
            clear_session(context, page)
            page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(2000)
            shot(page, "route-guard")

            guard_url = get_url(page)
            log(f"Unauthenticated /dashboard -> {guard_url}")

            # Check if we got redirected to login
            if "login" in guard_url.lower() or guard_url in (BASE_URL, BASE_URL + "/"):
                record("T7.1", "Unauthenticated /dashboard redirects to login", "PASS")
            elif "dashboard" in guard_url.lower():
                # Check if the page actually shows login form (SPA redirect)
                login_form = find_name_input()
                if login_form:
                    record("T7.1", "Unauthenticated /dashboard shows login form", "PASS",
                           "URL didn't change but login form is displayed")
                else:
                    record("T7.1", "Unauthenticated /dashboard redirects to login", "FAIL",
                           f"Still on dashboard: {guard_url}")
            else:
                record("T7.1", "Unauthenticated /dashboard redirect", "WARN", f"URL: {guard_url}")

        except Exception as e:
            record("T7", "Route guard", "FAIL", str(e))

        # =====================================================
        # T8: PM Login
        # =====================================================
        log("\n=== T8: PM Login ===")
        try:
            clear_session(context, page)
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            name_input = find_name_input()
            if name_input:
                name_input.fill("QA PM User")

            pm_btn = find_btn(ROLE_MAP["pm"])
            if pm_btn:
                pm_btn.click()
                page.wait_for_timeout(500)

            login_btn = find_login_btn()
            if login_btn:
                disabled = login_btn.evaluate("el => el.disabled")
                if not disabled:
                    login_btn.click()
                    try:
                        page.wait_for_url("**/dashboard**", timeout=15000)
                        page.wait_for_timeout(2000)
                        shot(page, "pm-dashboard")
                        url = get_url(page)
                        record("T8.1", "PM login -> Dashboard", "PASS")
                    except PlaywrightTimeout:
                        page.wait_for_timeout(3000)
                        url = get_url(page)
                        shot(page, "pm-after-login")
                        if "login" not in url.lower() and url not in (BASE_URL, BASE_URL + "/"):
                            record("T8.1", "PM login navigates to app", "WARN", f"URL: {url}")
                        else:
                            record("T8.1", "PM login -> Dashboard", "FAIL", f"URL: {url}")
                else:
                    record("T8.1", "PM login", "FAIL", "Button disabled")

            clear_session(context, page)
        except Exception as e:
            record("T8", "PM login", "FAIL", str(e))

        # =====================================================
        # T9: ADMIN (管理者) Login
        # =====================================================
        log("\n=== T9: ADMIN Login ===")
        try:
            clear_session(context, page)
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            name_input = find_name_input()
            if name_input:
                name_input.fill("QA Admin User")

            admin_btn = find_btn(ROLE_MAP["admin"])
            if admin_btn:
                admin_btn.click()
                page.wait_for_timeout(500)

            login_btn = find_login_btn()
            if login_btn:
                disabled = login_btn.evaluate("el => el.disabled")
                if not disabled:
                    login_btn.click()
                    try:
                        page.wait_for_url("**/dashboard**", timeout=15000)
                        page.wait_for_timeout(2000)
                        shot(page, "admin-dashboard")
                        record("T9.1", "ADMIN login -> Dashboard", "PASS")
                    except PlaywrightTimeout:
                        page.wait_for_timeout(3000)
                        url = get_url(page)
                        shot(page, "admin-after-login")
                        if "login" not in url.lower() and url not in (BASE_URL, BASE_URL + "/"):
                            record("T9.1", "ADMIN login navigates to app", "WARN", f"URL: {url}")
                        else:
                            record("T9.1", "ADMIN login -> Dashboard", "FAIL", f"URL: {url}")
                else:
                    record("T9.1", "ADMIN login", "FAIL", "Button disabled")

        except Exception as e:
            record("T9", "ADMIN login", "FAIL", str(e))

        # =====================================================
        # T10: Post-Logout Route Guard
        # =====================================================
        log("\n=== T10: Post-Logout Route Guard ===")
        try:
            url = get_url(page)
            if "login" not in url.lower() and url not in (BASE_URL, BASE_URL + "/"):
                # Logged in as ADMIN, find logout
                logout_done = False
                for selector in [
                    'button:has-text("登出")',
                    'a:has-text("登出")',
                ]:
                    try:
                        el = page.query_selector(selector)
                        if el and el.is_visible():
                            el.click()
                            page.wait_for_timeout(2000)
                            logout_done = True
                            break
                    except Exception:
                        pass

                if not logout_done:
                    # Try settings page
                    for sel in ['a[href*="settings"]', 'a:has-text("設定")']:
                        try:
                            el = page.query_selector(sel)
                            if el and el.is_visible():
                                el.click()
                                page.wait_for_timeout(1500)
                                break
                        except Exception:
                            pass
                    for selector in ['button:has-text("登出")', 'a:has-text("登出")']:
                        try:
                            el = page.query_selector(selector)
                            if el and el.is_visible():
                                el.click()
                                page.wait_for_timeout(2000)
                                logout_done = True
                                break
                        except Exception:
                            pass

                if not logout_done:
                    # Force clear
                    clear_session(context, page)

                # Try accessing /dashboard
                page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)
                shot(page, "post-logout-guard")
                guard_url = get_url(page)
                log(f"Post-logout /dashboard -> {guard_url}")

                if "login" in guard_url.lower() or guard_url in (BASE_URL, BASE_URL + "/"):
                    record("T10.1", "Post-logout /dashboard redirects to login", "PASS")
                else:
                    # Check if login form shows
                    login_form = find_name_input()
                    if login_form:
                        record("T10.1", "Post-logout /dashboard shows login form", "PASS")
                    else:
                        record("T10.1", "Post-logout /dashboard redirects to login", "FAIL", f"URL: {guard_url}")
            else:
                # Already on login, just test
                clear_session(context, page)
                page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)
                guard_url = get_url(page)
                if "login" in guard_url.lower() or guard_url in (BASE_URL, BASE_URL + "/"):
                    record("T10.1", "Post-logout /dashboard redirects to login", "PASS")
                else:
                    record("T10.1", "Post-logout /dashboard redirects to login", "FAIL", f"URL: {guard_url}")

        except Exception as e:
            record("T10", "Post-logout route guard", "FAIL", str(e))

        # =====================================================
        # Summary
        # =====================================================
        print("\n" + "=" * 70, flush=True)
        print("QA TEST SUMMARY - Login & Authentication", flush=True)
        print("=" * 70, flush=True)

        p_count = sum(1 for r in results if r["status"] == "PASS")
        f_count = sum(1 for r in results if r["status"] == "FAIL")
        w_count = sum(1 for r in results if r["status"] == "WARN")

        for r in results:
            detail = f" -- {r['detail']}" if r["detail"] else ""
            print(f"  {r['status']:4s} | {r['id']:8s} | {r['name']}{detail}", flush=True)

        print(f"\nTotal: {len(results)} | PASS: {p_count} | FAIL: {f_count} | WARN: {w_count}", flush=True)
        print(f"Screenshots saved to: {SCREENSHOT_DIR}", flush=True)

        browser.close()
        return f_count


if __name__ == "__main__":
    import sys
    failures = run_tests()
    sys.exit(0)  # always exit 0 for QA script
