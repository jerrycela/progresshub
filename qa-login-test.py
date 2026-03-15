#!/usr/bin/env python3
"""QA Login & Auth Test for ProgressHub using Playwright (Python)."""

import os
import re
import sys
import time

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
    log(f"Screenshot: {path}")
    return path


def find_buttons_by_text(page):
    """Return dict of role buttons and login button."""
    btns = page.query_selector_all("button")
    found = {"employee": None, "pm": None, "admin": None, "login": None, "all_texts": []}
    for btn in btns:
        text = (btn.text_content() or "").strip()
        found["all_texts"].append(text)
        tl = text.lower()
        if re.search(r"employee|一般員工|員工", tl) and not found["employee"]:
            found["employee"] = btn
        elif re.search(r"^pm$|專案經理|project\s*manager", tl) and not found["pm"]:
            found["pm"] = btn
        elif re.search(r"admin|管理員", tl) and not found["admin"]:
            found["admin"] = btn
        if re.search(r"登入|login|sign\s*in|demo", tl) and not found["login"]:
            found["login"] = btn
    return found


def find_name_input(page):
    """Find the name text input."""
    for selector in [
        'input[placeholder*="名"]',
        'input[placeholder*="name" i]',
        'input[type="text"]',
        "input:not([type=hidden]):not([type=password]):not([type=email]):not([type=checkbox]):not([type=radio])",
    ]:
        el = page.query_selector(selector)
        if el:
            return el
    return None


def clear_session(context, page):
    context.clear_cookies()
    page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
        )
        page = context.new_page()

        # =====================================================
        # T1: Login Page Load & Form Display
        # =====================================================
        log("=== T1: Login Page Load ===")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1500)
            shot(page, "initial-load")

            log(f"Title: {page.title()}")
            log(f"URL: {page.url()}")

            name_input = find_name_input(page)
            if name_input:
                record("T1.1", "Name input field visible", "PASS")
            else:
                all_inputs = page.query_selector_all("input")
                attrs = []
                for inp in all_inputs:
                    attrs.append(inp.evaluate("el => ({type:el.type,name:el.name,placeholder:el.placeholder,id:el.id})"))
                record("T1.1", "Name input field visible", "FAIL", f"No name input found. Inputs: {attrs}")

            btns = find_buttons_by_text(page)
            log(f"Buttons: {btns['all_texts']}")

            if btns["employee"] and btns["pm"] and btns["admin"]:
                record("T1.2", "Role buttons (EMPLOYEE/PM/ADMIN) present", "PASS")
            else:
                record("T1.2", "Role buttons (EMPLOYEE/PM/ADMIN) present", "WARN",
                       f"E={bool(btns['employee'])}, PM={bool(btns['pm'])}, A={bool(btns['admin'])}. Texts: {btns['all_texts']}")

            if btns["login"]:
                record("T1.3", "Login/Demo button present", "PASS")
            else:
                record("T1.3", "Login/Demo button present", "FAIL", f"No login button found. Texts: {btns['all_texts']}")

        except Exception as e:
            record("T1", "Login page loads", "FAIL", str(e))

        # =====================================================
        # T2: Role Button State Changes
        # =====================================================
        log("\n=== T2: Role Button State Changes ===")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)
            btns = find_buttons_by_text(page)

            for role_key, role_label in [("employee", "EMPLOYEE"), ("pm", "PM"), ("admin", "ADMIN")]:
                btn = btns[role_key]
                if btn:
                    classes_before = btn.evaluate("el => el.className")
                    btn.click()
                    page.wait_for_timeout(500)
                    classes_after = btn.evaluate("el => el.className")
                    shot(page, f"role-{role_key}-selected")

                    changed = classes_before != classes_after
                    log(f"  {role_label} classes before: {classes_before[:80]}")
                    log(f"  {role_label} classes after:  {classes_after[:80]}")

                    if changed:
                        record(f"T2.{role_key[0]}", f"{role_label} button shows selected state", "PASS")
                    else:
                        record(f"T2.{role_key[0]}", f"{role_label} button shows selected state", "WARN",
                               "Classes unchanged after click")
                else:
                    record(f"T2.{role_key[0]}", f"{role_label} button interaction", "FAIL", "Button not found")

        except Exception as e:
            record("T2", "Role button states", "FAIL", str(e))

        # =====================================================
        # T3: Login Button Enable/Disable Logic
        # =====================================================
        log("\n=== T3: Login Button Enable/Disable ===")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            btns = find_buttons_by_text(page)
            login_btn = btns["login"]

            if login_btn:
                initial_disabled = login_btn.evaluate("el => el.disabled")
                log(f"Login button initially disabled: {initial_disabled}")

                if initial_disabled:
                    record("T3.1", "Login button disabled when form empty", "PASS")
                else:
                    record("T3.1", "Login button disabled when form empty", "WARN",
                           "Button appears enabled without any input")

                # Fill name only
                name_input = find_name_input(page)
                if name_input:
                    name_input.fill("QA Tester")
                    page.wait_for_timeout(300)

                mid_disabled = login_btn.evaluate("el => el.disabled")
                log(f"Login disabled after name only: {mid_disabled}")

                # Select role
                if btns["employee"]:
                    btns["employee"].click()
                    page.wait_for_timeout(500)

                after_disabled = login_btn.evaluate("el => el.disabled")
                log(f"Login disabled after name+role: {after_disabled}")
                shot(page, "form-filled")

                if not after_disabled:
                    record("T3.2", "Login button enabled after name + role", "PASS")
                else:
                    record("T3.2", "Login button enabled after name + role", "FAIL",
                           "Button still disabled after filling all fields")
            else:
                record("T3", "Login button tests", "FAIL", "No login button found")

        except Exception as e:
            record("T3", "Login button logic", "FAIL", str(e))

        # =====================================================
        # T4: Project Selection (non-ADMIN vs ADMIN)
        # =====================================================
        log("\n=== T4: Project Selection ===")
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            btns = find_buttons_by_text(page)
            name_input = find_name_input(page)
            if name_input:
                name_input.fill("QA Tester")

            # Select EMPLOYEE - check for project dropdown
            if btns["employee"]:
                btns["employee"].click()
                page.wait_for_timeout(1000)
                shot(page, "employee-project-check")

                body_html = page.evaluate("() => document.body.innerHTML")
                has_project_text = bool(re.search(r"專案|project", body_html, re.I))

                # Look for select/dropdown elements that aren't role buttons
                selects = page.query_selector_all("select")
                dropdowns = page.query_selector_all('[class*="searchable"], [class*="dropdown"], [role="combobox"], [role="listbox"]')
                log(f"EMPLOYEE: selects={len(selects)}, dropdowns={len(dropdowns)}, project_text={has_project_text}")

                if selects or dropdowns:
                    record("T4.1", "Project selection visible for EMPLOYEE", "PASS")

                    # Try to interact with project select
                    if selects:
                        options = selects[0].evaluate("el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent.trim()}))")
                        log(f"  Project options: {options}")
                    elif dropdowns:
                        dropdowns[0].click()
                        page.wait_for_timeout(500)
                        shot(page, "employee-project-dropdown-open")
                else:
                    record("T4.1", "Project selection visible for EMPLOYEE", "WARN",
                           "No project selection UI detected for non-ADMIN role")

            # Switch to ADMIN - project should hide
            if btns["admin"]:
                btns["admin"].click()
                page.wait_for_timeout(1000)
                shot(page, "admin-project-check")

                selects_admin = page.query_selector_all("select")
                dropdowns_admin = page.query_selector_all('[class*="searchable"], [class*="dropdown"], [role="combobox"], [role="listbox"]')
                log(f"ADMIN: selects={len(selects_admin)}, dropdowns={len(dropdowns_admin)}")

                # For ADMIN the project selection should be hidden
                if not selects_admin and not dropdowns_admin:
                    record("T4.2", "Project selection hidden for ADMIN", "PASS")
                else:
                    record("T4.2", "Project selection hidden for ADMIN", "WARN",
                           f"UI elements still visible (selects={len(selects_admin)}, dropdowns={len(dropdowns_admin)})")

            # Switch to PM
            if btns["pm"]:
                btns["pm"].click()
                page.wait_for_timeout(1000)
                shot(page, "pm-project-check")

                selects_pm = page.query_selector_all("select")
                dropdowns_pm = page.query_selector_all('[class*="searchable"], [class*="dropdown"], [role="combobox"], [role="listbox"]')
                log(f"PM: selects={len(selects_pm)}, dropdowns={len(dropdowns_pm)}")

                if selects_pm or dropdowns_pm:
                    record("T4.3", "Project selection visible for PM", "PASS")
                else:
                    record("T4.3", "Project selection visible for PM", "WARN",
                           "No project selection UI detected for PM")

        except Exception as e:
            record("T4", "Project selection", "FAIL", str(e))

        # =====================================================
        # T5: EMPLOYEE Demo Login
        # =====================================================
        log("\n=== T5: EMPLOYEE Demo Login ===")
        try:
            clear_session(context, page)
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            btns = find_buttons_by_text(page)
            name_input = find_name_input(page)
            if name_input:
                name_input.fill("QA Employee")

            if btns["employee"]:
                btns["employee"].click()
                page.wait_for_timeout(500)

            shot(page, "before-employee-login")

            login_btn = btns["login"]
            if login_btn:
                disabled = login_btn.evaluate("el => el.disabled")
                if not disabled:
                    login_btn.click()
                    log("Clicked login button")

                    try:
                        page.wait_for_url("**/dashboard**", timeout=15000)
                        page.wait_for_timeout(2000)
                        shot(page, "employee-dashboard")
                        url = page.url()
                        log(f"After login: {url}")
                        if "dashboard" in url.lower():
                            record("T5.1", "EMPLOYEE login -> Dashboard", "PASS")
                        else:
                            record("T5.1", "EMPLOYEE login -> Dashboard", "FAIL", f"URL: {url}")
                    except PlaywrightTimeout:
                        page.wait_for_timeout(3000)
                        url = page.url()
                        shot(page, "employee-after-login-timeout")
                        log(f"Timeout. Current URL: {url}")
                        if url != BASE_URL and url != BASE_URL + "/" and "login" not in url.lower():
                            record("T5.1", "EMPLOYEE login navigates away", "WARN", f"URL: {url}")
                        else:
                            record("T5.1", "EMPLOYEE login -> Dashboard", "FAIL", f"Still on: {url}")
                else:
                    record("T5.1", "EMPLOYEE login", "FAIL", "Login button disabled")

        except Exception as e:
            record("T5", "EMPLOYEE login", "FAIL", str(e))

        # =====================================================
        # T6: Logout
        # =====================================================
        log("\n=== T6: Logout ===")
        try:
            url = page.url()
            log(f"Current URL: {url}")

            if "login" not in url.lower() and url != BASE_URL + "/":
                # We should be logged in - find logout
                logout_btn = None

                # Direct search
                for selector in [
                    'button:has-text("登出")',
                    'button:has-text("Logout")',
                    'a:has-text("登出")',
                    'a:has-text("Logout")',
                ]:
                    try:
                        el = page.query_selector(selector)
                        if el and el.is_visible():
                            logout_btn = el
                            break
                    except:
                        pass

                if not logout_btn:
                    # Try sidebar / settings
                    log("Looking for logout in sidebar/settings...")
                    for nav_selector in [
                        'a[href*="settings"]',
                        'a:has-text("設定")',
                        '[class*="sidebar"] a',
                        '[class*="avatar"]',
                        '[class*="user-menu"]',
                    ]:
                        try:
                            el = page.query_selector(nav_selector)
                            if el and el.is_visible():
                                el.click()
                                page.wait_for_timeout(1500)
                                shot(page, "looking-for-logout")
                                break
                        except:
                            pass

                    # Search again
                    for selector in [
                        'button:has-text("登出")',
                        'button:has-text("Logout")',
                        'a:has-text("登出")',
                        'a:has-text("Logout")',
                    ]:
                        try:
                            el = page.query_selector(selector)
                            if el and el.is_visible():
                                logout_btn = el
                                break
                        except:
                            pass

                if logout_btn:
                    logout_btn.click()
                    page.wait_for_timeout(3000)
                    shot(page, "after-logout")
                    url_after = page.url()
                    log(f"After logout: {url_after}")

                    if "login" in url_after.lower() or url_after == BASE_URL + "/" or url_after == BASE_URL:
                        record("T6.1", "Logout returns to login page", "PASS")
                    else:
                        record("T6.1", "Logout returns to login page", "FAIL", f"URL: {url_after}")
                else:
                    shot(page, "no-logout-found")
                    body_text = page.text_content("body") or ""
                    has_logout_text = bool(re.search(r"登出|logout|sign.?out", body_text, re.I))
                    record("T6.1", "Logout button found", "WARN",
                           f"No clickable logout. Text in page: {has_logout_text}")
            else:
                record("T6.1", "Logout test", "WARN", "Not logged in, skipping")

        except Exception as e:
            record("T6", "Logout", "FAIL", str(e))

        # =====================================================
        # T7: Route Guard (unauthenticated /dashboard)
        # =====================================================
        log("\n=== T7: Route Guard ===")
        try:
            clear_session(context, page)
            page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(2000)
            shot(page, "route-guard")

            guard_url = page.url()
            log(f"Unauthenticated /dashboard -> {guard_url}")

            if "login" in guard_url.lower() or guard_url in (BASE_URL, BASE_URL + "/"):
                record("T7.1", "Unauthenticated /dashboard redirects to login", "PASS")
            elif "dashboard" in guard_url.lower():
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

            btns = find_buttons_by_text(page)
            name_input = find_name_input(page)
            if name_input:
                name_input.fill("QA PM")

            if btns["pm"]:
                btns["pm"].click()
                page.wait_for_timeout(500)

            login_btn = btns["login"]
            if login_btn:
                disabled = login_btn.evaluate("el => el.disabled")
                if not disabled:
                    login_btn.click()
                    try:
                        page.wait_for_url("**/dashboard**", timeout=15000)
                        page.wait_for_timeout(2000)
                        shot(page, "pm-dashboard")
                        record("T8.1", "PM login -> Dashboard", "PASS")
                    except PlaywrightTimeout:
                        page.wait_for_timeout(3000)
                        url = page.url()
                        shot(page, "pm-after-login")
                        if url != BASE_URL and "login" not in url.lower():
                            record("T8.1", "PM login navigates to app", "WARN", f"URL: {url}")
                        else:
                            record("T8.1", "PM login -> Dashboard", "FAIL", f"URL: {url}")
                else:
                    record("T8.1", "PM login", "FAIL", "Button disabled")

            clear_session(context, page)
        except Exception as e:
            record("T8", "PM login", "FAIL", str(e))

        # =====================================================
        # T9: ADMIN Login
        # =====================================================
        log("\n=== T9: ADMIN Login ===")
        try:
            clear_session(context, page)
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            btns = find_buttons_by_text(page)
            name_input = find_name_input(page)
            if name_input:
                name_input.fill("QA Admin")

            if btns["admin"]:
                btns["admin"].click()
                page.wait_for_timeout(500)

            login_btn = btns["login"]
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
                        url = page.url()
                        shot(page, "admin-after-login")
                        if url != BASE_URL and "login" not in url.lower():
                            record("T9.1", "ADMIN login navigates to app", "WARN", f"URL: {url}")
                        else:
                            record("T9.1", "ADMIN login -> Dashboard", "FAIL", f"URL: {url}")
                else:
                    record("T9.1", "ADMIN login", "FAIL", "Button disabled")

        except Exception as e:
            record("T9", "ADMIN login", "FAIL", str(e))

        # =====================================================
        # T10: Logout then access /dashboard (route guard after logout)
        # =====================================================
        log("\n=== T10: Post-Logout Route Guard ===")
        try:
            # We should be logged in as ADMIN from T9
            url = page.url()
            if "login" not in url.lower() and url not in (BASE_URL, BASE_URL + "/"):
                # Find and click logout
                logout_found = False
                for selector in [
                    'button:has-text("登出")',
                    'button:has-text("Logout")',
                    'a:has-text("登出")',
                    'a:has-text("Logout")',
                ]:
                    try:
                        el = page.query_selector(selector)
                        if el and el.is_visible():
                            el.click()
                            page.wait_for_timeout(2000)
                            logout_found = True
                            break
                    except:
                        pass

                if not logout_found:
                    # Navigate to settings first
                    for sel in ['a[href*="settings"]', 'a:has-text("設定")']:
                        try:
                            el = page.query_selector(sel)
                            if el and el.is_visible():
                                el.click()
                                page.wait_for_timeout(1500)
                                break
                        except:
                            pass
                    for selector in ['button:has-text("登出")', 'a:has-text("登出")']:
                        try:
                            el = page.query_selector(selector)
                            if el and el.is_visible():
                                el.click()
                                page.wait_for_timeout(2000)
                                logout_found = True
                                break
                        except:
                            pass

                if logout_found:
                    # Now try to access /dashboard
                    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=15000)
                    page.wait_for_timeout(2000)
                    shot(page, "post-logout-route-guard")
                    guard_url = page.url()
                    log(f"Post-logout /dashboard -> {guard_url}")

                    if "login" in guard_url.lower() or guard_url in (BASE_URL, BASE_URL + "/"):
                        record("T10.1", "Post-logout /dashboard redirects to login", "PASS")
                    else:
                        record("T10.1", "Post-logout /dashboard redirects to login", "FAIL", f"URL: {guard_url}")
                else:
                    record("T10.1", "Post-logout route guard", "WARN", "Could not find logout button to test")
            else:
                # Already logged out, just test directly
                page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(2000)
                guard_url = page.url()
                if "login" in guard_url.lower() or guard_url in (BASE_URL, BASE_URL + "/"):
                    record("T10.1", "Post-logout /dashboard redirects to login", "PASS")
                else:
                    record("T10.1", "Post-logout /dashboard redirects to login", "FAIL", f"URL: {guard_url}")

        except Exception as e:
            record("T10", "Post-logout route guard", "FAIL", str(e))

        # =====================================================
        # Summary
        # =====================================================
        print("\n" + "=" * 60, flush=True)
        print("QA TEST SUMMARY - Login & Auth", flush=True)
        print("=" * 60, flush=True)

        p_count = sum(1 for r in results if r["status"] == "PASS")
        f_count = sum(1 for r in results if r["status"] == "FAIL")
        w_count = sum(1 for r in results if r["status"] == "WARN")

        for r in results:
            detail = f" -- {r['detail']}" if r["detail"] else ""
            print(f"  {r['status']:4s} | {r['id']:6s} | {r['name']}{detail}", flush=True)

        print(f"\nTotal: {len(results)} | PASS: {p_count} | FAIL: {f_count} | WARN: {w_count}", flush=True)

        browser.close()


if __name__ == "__main__":
    run_tests()
