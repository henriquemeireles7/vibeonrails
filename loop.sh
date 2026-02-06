#!/bin/bash
# ============================================================================
# AI Autonomous Loop
# Based on the Ralph Wiggum technique - adapted for the AI Workflow template
#
# Usage:
#   ./loop.sh              # Build mode (default) - implements from plan
#   ./loop.sh plan         # Plan mode - creates IMPLEMENTATION_PLAN.md
#   ./loop.sh plan-work    # Plan+Work mode - plans one task, builds, repeat
#   ./loop.sh [mode] [max] # Set max iterations (default: 25)
#
# Prerequisites:
#   - claude CLI installed (npm install -g @anthropic-ai/claude-code)
#   - Git repo initialized
#   - AGENTS.md at project root (operational brief)
#   - specs/*.md with requirements (for plan mode)
#   - IMPLEMENTATION_PLAN.md (for build mode)
#   - prompts/ folder with PROMPT_plan.md and PROMPT_build.md
# ============================================================================

set -euo pipefail

# --- Configuration ---
MODE="${1:-build}"
MAX_ITERATIONS="${2:-25}"
PROMPT_DIR="prompts"
PROMPT_PLAN="${PROMPT_DIR}/PROMPT_plan.md"
PROMPT_BUILD="${PROMPT_DIR}/PROMPT_build.md"
PROMPT_PLAN_WORK="${PROMPT_DIR}/PROMPT_plan_work.md"
PLAN_FILE="IMPLEMENTATION_PLAN.md"
SESSION_DIR="sessions"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Functions ---
log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${CYAN}[STEP $ITERATION/$MAX_ITERATIONS]${NC} $1"; }

check_prerequisites() {
    local missing=0

    if ! command -v claude &> /dev/null; then
        log_error "claude CLI not found. Install: npm install -g @anthropic-ai/claude-code"
        missing=1
    fi

    if ! git rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
        log_error "Not inside a git repository"
        missing=1
    fi

    if [[ ! -f "AGENTS.md" ]]; then
        log_warn "AGENTS.md not found - create one from the template (see agents/ folder)"
    fi

    case "$MODE" in
        plan)
            if [[ ! -f "$PROMPT_PLAN" ]]; then
                log_error "Missing $PROMPT_PLAN - copy from prompts/ in the ai-workflow template"
                missing=1
            fi
            if [[ ! -d "specs" ]] || [[ -z "$(ls -A specs/ 2>/dev/null)" ]]; then
                log_warn "specs/ is empty - the planner needs requirements to work with"
            fi
            ;;
        build)
            if [[ ! -f "$PROMPT_BUILD" ]]; then
                log_error "Missing $PROMPT_BUILD - copy from prompts/ in the ai-workflow template"
                missing=1
            fi
            if [[ ! -f "$PLAN_FILE" ]]; then
                log_error "Missing $PLAN_FILE - run './loop.sh plan' first"
                missing=1
            fi
            ;;
        plan-work)
            if [[ ! -f "$PROMPT_PLAN_WORK" ]]; then
                log_error "Missing $PROMPT_PLAN_WORK - copy from prompts/ in the ai-workflow template"
                missing=1
            fi
            ;;
        *)
            log_error "Unknown mode: $MODE (use: plan, build, or plan-work)"
            missing=1
            ;;
    esac

    if [[ $missing -eq 1 ]]; then
        exit 1
    fi
}

select_prompt() {
    case "$MODE" in
        plan)      echo "$PROMPT_PLAN" ;;
        build)     echo "$PROMPT_BUILD" ;;
        plan-work) echo "$PROMPT_PLAN_WORK" ;;
    esac
}

save_session() {
    local exit_code=$1
    local session_file="${SESSION_DIR}/${TIMESTAMP}_${MODE}_iter${ITERATION}.md"

    mkdir -p "$SESSION_DIR"
    cat > "$session_file" << EOF
# Session: ${MODE} iteration ${ITERATION}
- **Date**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- **Branch**: ${CURRENT_BRANCH}
- **Mode**: ${MODE}
- **Iteration**: ${ITERATION}/${MAX_ITERATIONS}
- **Exit Code**: ${exit_code}
- **Files Changed**: $(git diff --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')

## Changed Files
$(git diff --name-only HEAD 2>/dev/null || echo "none")

## Git Log (last entry)
$(git log -1 --oneline 2>/dev/null || echo "no commits yet")
EOF
    log_info "Session saved: $session_file"
}

check_done() {
    # In build mode, check if IMPLEMENTATION_PLAN.md has all tasks marked done
    if [[ "$MODE" == "build" ]] && [[ -f "$PLAN_FILE" ]]; then
        local total=$(grep -c '^\s*- \[' "$PLAN_FILE" 2>/dev/null || echo "0")
        local done=$(grep -c '^\s*- \[x\]' "$PLAN_FILE" 2>/dev/null || echo "0")

        if [[ "$total" -gt 0 ]] && [[ "$total" -eq "$done" ]]; then
            log_ok "All $total tasks in $PLAN_FILE are complete!"
            return 0
        fi
        log_info "Progress: $done/$total tasks complete"
        return 1
    fi

    # In plan mode, check if IMPLEMENTATION_PLAN.md exists
    if [[ "$MODE" == "plan" ]] && [[ -f "$PLAN_FILE" ]]; then
        local tasks=$(grep -c '^\s*- \[' "$PLAN_FILE" 2>/dev/null || echo "0")
        if [[ "$tasks" -gt 0 ]]; then
            log_ok "$PLAN_FILE created with $tasks tasks"
            return 0
        fi
    fi

    return 1
}

# --- Main Loop ---
main() {
    echo ""
    echo "======================================"
    echo "  AI Autonomous Loop"
    echo "  Mode: $MODE | Max: $MAX_ITERATIONS"
    echo "  Branch: $CURRENT_BRANCH"
    echo "======================================"
    echo ""

    check_prerequisites

    PROMPT_FILE=$(select_prompt)
    log_info "Using prompt: $PROMPT_FILE"
    log_info "Starting $MODE loop (max $MAX_ITERATIONS iterations)"
    echo ""

    ITERATION=0

    while true; do
        ITERATION=$((ITERATION + 1))

        if [[ $ITERATION -gt $MAX_ITERATIONS ]]; then
            log_warn "Reached max iterations ($MAX_ITERATIONS). Stopping."
            log_warn "Review progress and run again if needed."
            break
        fi

        log_step "Starting $MODE iteration"

        # --- Run Claude ---
        # Feed the prompt to claude in headless mode
        # --dangerously-skip-permissions: allows autonomous file operations
        # --output-format stream-json: structured output for monitoring
        # --verbose: detailed logging
        cat "$PROMPT_FILE" | claude -p \
            --dangerously-skip-permissions \
            --output-format=stream-json \
            --verbose 2>&1 | tee "${SESSION_DIR}/${TIMESTAMP}_${MODE}_iter${ITERATION}_raw.log" || {
            local exit_code=$?
            log_error "Claude exited with code $exit_code"
            save_session $exit_code

            if [[ $exit_code -eq 1 ]]; then
                log_warn "Claude error - will retry next iteration"
                continue
            else
                log_error "Unexpected error - stopping loop"
                break
            fi
        }

        log_ok "Claude completed iteration $ITERATION"

        # --- Git: commit and push ---
        if [[ -n "$(git status --porcelain)" ]]; then
            git add -A
            git commit -m "loop(${MODE}): iteration ${ITERATION} - $(date +%H:%M:%S)" \
                --no-verify 2>/dev/null || {
                log_warn "Nothing to commit after iteration $ITERATION"
            }

            git push origin "$CURRENT_BRANCH" 2>/dev/null || {
                log_info "Creating remote branch..."
                git push -u origin "$CURRENT_BRANCH"
            }
            log_ok "Changes pushed to origin/$CURRENT_BRANCH"
        else
            log_info "No changes to commit"
        fi

        # --- Check completion ---
        if check_done; then
            log_ok "Loop complete! All tasks finished."
            save_session 0
            break
        fi

        save_session 0
        log_info "Continuing to next iteration..."
        echo ""
    done

    echo ""
    echo "======================================"
    echo "  Loop finished"
    echo "  Mode: $MODE"
    echo "  Iterations: $ITERATION"
    echo "  Branch: $CURRENT_BRANCH"
    echo "======================================"
}

main
