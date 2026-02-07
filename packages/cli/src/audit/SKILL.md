# Audit System

## What This Does
The audit system implements all 172 checks from vibeaudit.md as automated (where possible) or manual-verification checkers. It scans a codebase for security issues, performance problems, code quality concerns, and more.

## Architecture
```
audit/
  types.ts          # Core types (AuditCheck, AuditContext, AuditReport, etc.)
  context.ts        # Builds audit context from project directory
  helpers.ts        # Factory functions (patternCheck, configCheck, manualCheck, etc.)
  runner.ts         # Executes checks and collects results
  scorer.ts         # Calculates weighted scores and builds reports
  registry.ts       # Central registry of all 172 checks with filtering
  index.ts          # Barrel export
  checkers/         # 14 checker modules, one per vibeaudit.md category
    top30.ts        # TOP-001..030 (30 checks)
    security.ts     # SEC-001..015 (15 checks)
    performance.ts  # PERF-001..015 (15 checks)
    testing.ts      # TEST-001..012 (12 checks)
    code-quality.ts # CODE-001..015 (15 checks)
    error-handling.ts # ERR-001..010 (10 checks)
    architecture.ts # ARCH-001..010 (10 checks)
    deployment.ts   # DEPLOY-001..007 (7 checks)
    observability.ts # OBS-001..008 (8 checks)
    business.ts     # BIZ-001..010 (10 checks)
    data-integrity.ts # DATA-001..010 (10 checks)
    ux.ts           # UX-001..010 (10 checks)
    compliance.ts   # PRIV-001..008 (8 checks)
    ai-patterns.ts  # AI-001..012 (12 checks)
```

## Check Types
- **patternCheck**: Fails when a regex IS found (bad pattern detection)
- **missingPatternCheck**: Fails when a regex is NOT found (required pattern)
- **fileExistsCheck**: Fails when required files are missing
- **configCheck**: Custom validation via callback function
- **fileSizeCheck**: Fails when files exceed line count
- **manualCheck**: Always skips, marks for human verification

## CLI Usage
```bash
vibe audit                    # Run all 172 checks
vibe audit --top30            # Top 30 non-negotiables only
vibe audit --critical         # Only CRITICAL severity
vibe audit --category security # Filter by category
vibe audit --automatable      # Skip manual checks
vibe audit --json             # Machine-readable JSON output
vibe audit --score            # Just the score (0-100)
vibe audit --ci               # Exit 1 on critical failures
```

## Adding a New Check
1. Choose the appropriate checker module in `checkers/`
2. Add a check using one of the helper functions
3. Add the corresponding test
4. The registry auto-discovers checks from all checker modules

## Score Calculation
- Weighted by severity: critical=10, high=5, medium=2, low=1
- Skipped (manual) checks are excluded from scoring
- Warnings count as 50% pass
- Score = (earned weight / total weight) * 100
