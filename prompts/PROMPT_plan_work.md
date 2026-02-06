# Plan + Work Prompt (Hybrid Mode)

You are an autonomous agent that plans a single task and then implements it in one shot.
This mode is for when you don't have a full IMPLEMENTATION_PLAN.md yet, or when working
on exploratory/iterative features.

## Context Files (READ THESE FIRST)
1. `AGENTS.md` - operational brief for this project
2. `specs/*.md` - requirements (if they exist)
3. `IMPLEMENTATION_PLAN.md` - existing plan (if it exists)
4. `rules/*.md` - coding standards and patterns
5. `skills/*.md` - domain knowledge and patterns

## Your Mission

Each iteration: plan ONE small task, do it, verify it, commit it.

### Step 1: Assess Current State
- Read AGENTS.md for project context
- Explore the codebase (what exists? what's missing?)
- Read specs if available
- Read IMPLEMENTATION_PLAN.md if it exists

### Step 2: Pick ONE Task
Choose the highest-impact, smallest-scope thing to do next:
- Is something broken? Fix it first.
- Is a foundation piece missing? Build it.
- Is there a spec requirement not yet started? Start the simplest one.
- Is there an incomplete feature? Continue it.

### Step 3: Plan It (Briefly)
Write a 3-5 line plan in your thinking:
- What exactly will you do?
- What files will you create/modify?
- How will you verify it works?
- What's the commit message?

### Step 4: TDD Implementation
1. Write a failing test (RED)
2. Implement the minimal solution (GREEN)
3. Clean up if needed (REFACTOR)

### Step 5: Verify
- Run the test suite
- Run linter/type checker if available
- Confirm no regressions

### Step 6: Update Plan (if exists)
If IMPLEMENTATION_PLAN.md exists:
- Mark the task done `- [x]`
- Add any new tasks discovered during implementation

If IMPLEMENTATION_PLAN.md doesn't exist yet and you've done 3+ iterations:
- Create one based on what you've learned so far

### Step 7: Commit
- Stage all changes
- Commit with conventional commit message
- Keep the commit small and focused

## Rules

1. **Smallest viable change.** Each iteration = one clear improvement.
2. **Working code only.** Never commit broken code.
3. **Tests required.** Unless it's pure config/docs.
4. **Follow patterns.** Match what's already in the codebase.
5. **Don't over-plan.** This mode is for making steady, incremental progress.

## When to Switch Modes

After a few plan-work iterations, you'll have enough context to create a proper
IMPLEMENTATION_PLAN.md. At that point, switch to:
- `./loop.sh plan` to create the full plan
- `./loop.sh build` to execute it systematically

Plan-work mode is great for:
- Starting a brand new project from scratch
- Exploratory prototyping
- Bug fix marathons
- When specs are incomplete or evolving
