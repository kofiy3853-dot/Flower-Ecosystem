# Plan 010: Delete tracked test credential files and add to .gitignore

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before moving on. STOP on any STOP condition.
> Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 9d726ad..HEAD -- t.json t1.json t2.json`
> If these files no longer exist, mark this plan DONE — nothing to do.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9d726ad`, 2026-07-07

## Why this matters

Three JSON files (`t.json`, `t1.json`, `t2.json`) are tracked in the git
repository. They contain user IDs that were likely written during development
sessions and not cleaned up. While the current content appears to be UUIDs
rather than passwords, these files represent an established bad habit and a
growing risk: future iterations of similar files may contain tokens, emails,
or credentials. They should be deleted and ignored.

**Note**: The files contain only user ID values, not passwords or tokens. No
credential rotation is needed — just deletion and gitignore.

## Current state

- `t.json` (50 bytes): contains `{"user_id":"<uuid>"}` — a single user ID
- `t1.json` (57 bytes): similar structure
- `t2.json` (53 bytes): similar structure
- `.gitignore` (60 bytes): does not currently ignore `t*.json` files

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Verify deleted | `git status` | Shows t.json, t1.json, t2.json as deleted |
| Verify ignored | `git status` | No new untracked t*.json after deletion |
| Lint/check | `node tests/run.js` | All pass |

## Scope

**In scope**:
- `t.json`, `t1.json`, `t2.json` — delete
- `.gitignore` — add entries

**Out of scope**:
- All other files

## Steps

### Step 1: Delete the test credential files

```
del t.json t1.json t2.json
```
(or `rm t.json t1.json t2.json` on Unix)

**Verify**: `dir t*.json` (Windows) or `ls t*.json` → "File not found" / no output.

### Step 2: Add patterns to `.gitignore`

Open `.gitignore` and append the following lines:

```
# Scratch/test session files — never commit
t.json
t1.json
t2.json
t*.json
```

**Verify**: `git status` → the deleted files show as "deleted", and if you
create a new `t3.json`, `git status` shows it as "ignored" (not "untracked").

### Step 3: Stage and verify

```
git add -u t.json t1.json t2.json .gitignore
git status
```

Expected: the three files show as "deleted" (staged), `.gitignore` shows as
"modified" (staged). No other files changed.

### Step 4: Run tests to confirm nothing broke

**Verify**: `node tests/run.js` → all pass.

## Done criteria

- [ ] `git ls-files t.json t1.json t2.json` returns no output (files no longer tracked)
- [ ] `.gitignore` contains `t*.json`
- [ ] `node tests/run.js` exits 0
- [ ] Only the three JSON files (deleted) and `.gitignore` are modified
- [ ] `plans/README.md` status updated

## STOP conditions

- Any test file imports or reads `t.json`, `t1.json`, or `t2.json` — find
  the reference, evaluate if the test needs a real fixture, and report before
  deleting.
- `git ls-files` shows these files are referenced by a git submodule or LFS —
  STOP and report the unusual configuration.

## Maintenance notes

- Add a note in any onboarding documentation (when created) that local scratch
  files should use the `scratch/` directory pattern, not root-level JSON files.
- If a future developer needs to store a temporary user ID for testing, the
  correct approach is a `.env.test` file (already gitignored by convention) or
  a test fixture in `tests/fixtures/`.
