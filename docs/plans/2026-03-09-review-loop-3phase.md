# Review Loop 三階段改造計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將 review-loop 插件從兩階段（task → addressing）改為三階段（task → addressing → qa），增加 Codex QA 驗證步驟，並在最終通過後由 Claude 自動 commit & push。

**Architecture:** 在 `stop-hook.sh` 的 case 分支中新增 `addressing` 階段的 Codex QA 呼叫（精簡 prompt，只驗證修復品質），以及 `qa` 階段的放行邏輯。狀態機從 `task → addressing → done` 變為 `task → addressing → qa → done`。

**Tech Stack:** Bash (stop-hook.sh), YAML frontmatter 狀態檔, jq, Codex CLI

**插件路徑：** `/Users/admin/.claude/plugins/marketplaces/hamel-review/plugins/review-loop/`

---

## 狀態機變更

```
原本：task ──[Codex review]──→ addressing ──[Claude 修完]──→ approve exit
改後：task ──[Codex review]──→ addressing ──[Claude 修完]──→ qa ──[Codex QA]──→ commit & approve exit
                                                                    └──[QA 失敗]──→ addressing（再修一輪）
```

---

### Task 1: 修改 stop-hook.sh — addressing 階段觸發 QA

**Files:**
- Modify: `hooks/stop-hook.sh:350-355` (原 `addressing)` case 分支)

**Step 1: 將 addressing 階段從「直接放行」改為「觸發 Codex QA」**

把原本的：

```bash
  addressing)
    # ── Phase 2 complete: Claude addressed the review. Allow exit. ───────
    log "Review loop complete (review_id=$REVIEW_ID)"
    rm -f "$STATE_FILE"
    printf '{"decision":"approve"}\n'
    ;;
```

改為：

```bash
  addressing)
    # ── Phase 2 → 3: Run Codex QA verification ──────────────────────────
    REVIEW_FILE="reviews/review-${REVIEW_ID}.md"
    QA_FILE="reviews/qa-${REVIEW_ID}.md"

    QA_PROMPT="You are performing a QA verification of code changes.

A previous code review was written to ${REVIEW_FILE}. The developer has addressed the feedback.

Run \`git diff\` and \`git diff --cached\` to see all current uncommitted changes.

If the review file exists, read it and verify that critical and high severity items have been properly addressed.

Then check:
1. Do the changes compile/build without errors? Run any available build/lint commands.
2. Are there obvious regressions or new issues introduced by the fixes?
3. Were critical/high severity review items properly resolved?

Write your QA verdict to ${QA_FILE} with this structure:
---
verdict: PASS or FAIL
issues_found: <number>
---

If PASS: Briefly confirm what was verified.
If FAIL: List the specific unresolved items that need attention.

IMPORTANT: You MUST create the file ${QA_FILE} with your verdict."

    CODEX_FLAGS="${REVIEW_LOOP_CODEX_FLAGS:---dangerously-bypass-approvals-and-sandbox}"
    CODEX_EXIT=0
    START_TIME=$(date +%s)

    log "Starting Codex QA verification (review_id=$REVIEW_ID)"
    # shellcheck disable=SC2086
    codex $CODEX_FLAGS exec "$QA_PROMPT" >/dev/null 2>&1 || CODEX_EXIT=$?
    ELAPSED=$(( $(date +%s) - START_TIME ))
    log "Codex QA finished (exit=$CODEX_EXIT, elapsed=${ELAPSED}s)"

    # Transition to qa phase
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's/^phase: addressing$/phase: qa/' "$STATE_FILE"
    else
      sed -i 's/^phase: addressing$/phase: qa/' "$STATE_FILE"
    fi

    if [ ! -f "$QA_FILE" ]; then
      log "WARN: QA file not created, treating as PASS"
      rm -f "$STATE_FILE"
      REASON="Codex QA verification completed but did not produce a report. Treating as PASS.

Please commit and push your changes now:
1. Stage all relevant files
2. Write a clear commit message explaining the changes
3. Push to the remote branch"
      SYS_MSG="Review Loop [${REVIEW_ID}] — QA Complete (no report): Commit & Push"
      jq -n --arg r "$REASON" --arg s "$SYS_MSG" \
        '{decision:"block", reason:$r, systemMessage:$s}'
      exit 0
    fi

    # Parse verdict from QA file
    QA_VERDICT=$(sed -n 's/^verdict: *//p' "$QA_FILE" | head -1 | tr '[:lower:]' '[:upper:]')

    if [ "$QA_VERDICT" = "PASS" ]; then
      log "QA PASSED (review_id=$REVIEW_ID)"
      rm -f "$STATE_FILE"
      REASON="Codex QA verification PASSED. The QA report is at ${QA_FILE}.

Please commit and push your changes now:
1. Review the changes with \`git diff\`
2. Stage all relevant files
3. Write a clear commit message explaining the changes
4. Push to the remote branch"
      SYS_MSG="Review Loop [${REVIEW_ID}] — QA PASSED: Commit & Push"
      jq -n --arg r "$REASON" --arg s "$SYS_MSG" \
        '{decision:"block", reason:$r, systemMessage:$s}'
    else
      log "QA FAILED (review_id=$REVIEW_ID)"
      # Revert to addressing phase for another fix round
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's/^phase: qa$/phase: addressing/' "$STATE_FILE"
      else
        sed -i 's/^phase: qa$/phase: addressing/' "$STATE_FILE"
      fi
      REASON="Codex QA verification FAILED. The QA report is at ${QA_FILE}.

Please:
1. Read the QA report carefully
2. Fix the remaining issues identified
3. When done, stop again — QA will re-run automatically"
      SYS_MSG="Review Loop [${REVIEW_ID}] — QA FAILED: Fix remaining issues"
      jq -n --arg r "$REASON" --arg s "$SYS_MSG" \
        '{decision:"block", reason:$r, systemMessage:$s}'
    fi
    ;;
```

**Step 2: 新增 qa 階段的 case 分支（在 addressing 之後、`*` 之前）**

```bash
  qa)
    # ── Phase 3 complete: Claude committed. Allow exit. ──────────────────
    log "Review loop fully complete with QA (review_id=$REVIEW_ID)"
    rm -f "$STATE_FILE"
    printf '{"decision":"approve"}\n'
    ;;
```

**Step 3: 更新防迴圈安全檢查**

原本只檢查 `task` 階段的迴圈保護，需要擴展到 `addressing`：

```bash
# 原本
if [ "$STOP_HOOK_ACTIVE" = "true" ] && [ "$PHASE" = "task" ]; then

# 改為
if [ "$STOP_HOOK_ACTIVE" = "true" ] && { [ "$PHASE" = "task" ] || [ "$PHASE" = "addressing" ]; }; then
```

---

### Task 2: 更新 setup-review-loop.sh 顯示訊息

**Files:**
- Modify: `scripts/setup-review-loop.sh:88-99`

**Step 1: 更新 lifecycle 顯示為三階段**

```bash
echo ""
echo "Review Loop activated"
echo "  ID:      ${REVIEW_ID}"
echo "  Phase:   1/3 — Task implementation"
echo "  Review:  reviews/review-${REVIEW_ID}.md"
echo "  QA:      reviews/qa-${REVIEW_ID}.md"
echo ""
echo "  Lifecycle:"
echo "    1. You implement the task"
echo "    2. Stop hook runs Codex for independent review"
echo "    3. You address the feedback"
echo "    4. Stop hook runs Codex QA verification"
echo "    5. QA pass → you commit & push"
echo ""
echo "  Use /cancel-review to abort."
echo ""
```

---

### Task 3: 更新 review-loop.md command 說明

**Files:**
- Modify: `commands/review-loop.md:31-38`

**Step 1: 更新 lifecycle 說明**

```markdown
When you believe the task is fully done, stop. The review loop stop hook will automatically:
1. Run Codex for an independent code review
2. Present the review for you to address
3. After you address feedback, run Codex QA verification
4. If QA passes, prompt you to commit & push
5. If QA fails, send you back to fix remaining issues

RULES:
- Complete the task to the best of your ability before stopping
- Do not stop prematurely or skip parts of the task
- The review loop handles the rest automatically
- After QA passes, commit all changes and push to remote
```

---

### Task 4: 更新 AGENTS.md 文件

**Files:**
- Modify: `AGENTS.md`

**Step 1: 更新描述為三階段**

```markdown
# review-loop Plugin — Agent Guidelines

## What this is

A Claude Code plugin that creates a three-phase review loop:
1. Claude implements a task
2. Codex independently reviews the changes (suggestions only)
3. Claude addresses the review feedback
4. Codex performs QA verification of the fixes
5. If QA passes, Claude commits and pushes
6. If QA fails, Claude fixes remaining issues and QA re-runs

## Conventions

- Shell scripts must work on both macOS and Linux (handle `sed -i` differences)
- The stop hook MUST always produce valid JSON to stdout — never let non-JSON text leak
- Fail-open: on any error, approve exit rather than trapping the user
- State lives in `.claude/review-loop.local.md` — always clean up on exit
- Review ID format: `YYYYMMDD-HHMMSS-hexhex` — validate before using in paths
- Codex stdout/stderr is redirected away from hook stdout to prevent JSON corruption
- Telemetry goes to `.claude/review-loop.log` — structured, timestamped lines
- QA verdict file uses YAML frontmatter with `verdict: PASS` or `verdict: FAIL`

## Phase transitions

- `task` → Claude finishes implementation → Codex review → `addressing`
- `addressing` → Claude fixes issues → Codex QA → `qa` (if PASS) or back to `addressing` (if FAIL)
- `qa` → Claude committed → approve exit

## Security constraints

- Review IDs are validated against `^[0-9]{8}-[0-9]{6}-[0-9a-f]{6}$` to prevent path traversal
- Codex flags are configurable via `REVIEW_LOOP_CODEX_FLAGS` env var
- No secrets or credentials are stored in state files

## Testing

- After modifying stop-hook.sh, test all paths: no-state, task→addressing, addressing→qa, qa→approve
- Verify JSON output with `jq .` for each path
- Test with codex unavailable (should fall back gracefully)
- Test with malformed state files (should fail-open)
- Test QA FAIL path: verify phase reverts to addressing
```

---

## 風險與注意事項

1. **無限迴圈風險**：QA FAIL 會回到 addressing，Claude 再修完又觸發 QA。需要加入最大重試次數（建議 3 次），超過就強制 PASS 放行。
2. **Codex 認證**：上次確認 Codex CLI 需要 `codex login` 完成 OAuth，確保已認證。
3. **插件是 git repo**：修改後不要 commit 到插件的 repo，這些是本地客製化。
4. **fail-open 原則**：所有新增路徑都必須在錯誤時 approve exit，不可困住使用者。
