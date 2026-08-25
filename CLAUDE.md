# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

```bash
npm run build       # tsc + chmod build/index.js executable
npm run typecheck   # tsc --noEmit
npm run lint         # biome check
npm run lint:fix    # biome check --write --unsafe --organize-imports-enabled
npm run auth        # tsc + run build/auth.js — OAuth login flow, writes spotify-config.json
```

No test framework is configured in this repo (no `test` script, no test files) — the MR/PR gates below use typecheck + lint + build clean + live-verification in place of a test suite. Adding real test coverage is a known gap, not yet a blocker.

## Architecture

TypeScript, ESM (`"type": "module"`), MCP server over stdio (`@modelcontextprotocol/sdk`) wrapping `@spotify/web-api-ts-sdk`. Entry point `build/index.js` (compiled from `src/`). OAuth tokens live in `spotify-config.json`, read/written via helpers in `src/utils.ts` — as of the fix below, behind a `proper-lockfile` cross-process lock with atomic (temp-file + rename) writes.

## Don't Ask, Just Proceed

Same carve-out as `google-mcp`/`signal-mcp`: routine edits, git operations, and tests in this repo proceed without asking — merge (MR) and PR are excluded, see below.

## Branching & terminology: MR vs PR

Same three-branch model as `google-mcp`/`signal-mcp`, local to this checkout:

- **`main`** — a pure mirror of `upstream/main` (`marcelmarais/spotify-mcp-server`); doc-only exceptions may land here directly when explicitly instructed.
- **`local-dev`** — the integration branch actually built and run as the live MCP server (registered globally in `~/.claude.json`, `node /Users/rtack/dev/ai/spotify-mcp-server/build/index.js`). All feature branches start here, not from `main`: `git checkout -b feat/<name> local-dev`.
- **`feat/<name>`** — one per feature/fix, pushed to `origin` (the fork, `rtack/spotify-mcp-server`) once ready. Fast-forward only, no merge commits: rebase onto `local-dev`'s current tip (`git rebase local-dev`) before merging.

Two distinct actions, two distinct terms:

- **MR** = merging a `feat/<name>` branch into **`local-dev`** (the local fork/integration branch). A plain `git merge`, not a GitHub PR. **Gate: live-verified only** — green typecheck/lint/build are necessary but not sufficient. No code review required.
- **PR** = a GitHub pull request opened against **`marcelmarais/spotify-mcp-server`** (the external upstream repo). **Gate: everything MR requires, plus**: code-reviewed (e.g. `/code-review` on the branch diff).

**Merging (MR) is approval-gated, not Claude-forbidden.** Claude may run `git merge` into `local-dev` — but only after: (1) the MR gate below is satisfied, (2) Claude has explicitly proposed *that specific merge* and stated the gate is satisfied, (3) explicit approval for *that specific proposal*. Never merge preemptively. Opening a PR follows the same propose-then-approve pattern, at the PR gate.

Before an **MR**, confirm, then propose and wait for approval:
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` all clean
- [ ] Live-verified against real Spotify data where practical
- [ ] Explicit, in-the-moment approval for *that specific merge*

Before a **PR**, confirm all of the above, plus:
- [ ] Code-reviewed — findings addressed or explicitly accepted
- [ ] PR targets `marcelmarais/spotify-mcp-server` (upstream), not the fork's own `main`, unless explicitly told otherwise
- [ ] Explicit, in-the-moment approval for opening

## MR/PR Gates Require Evidence, Not Just a Checked Box

A checklist item above is satisfied only when its evidence is pasted into that turn — not recalled from memory or asserted in passing.

- **`typecheck`/`lint`/`build` clean** — paste the real output, not a claim that it passed.
- **Live-verified** — state the exact call made and its result. "Deferred" is not evidence of anything except that this item is unmet.
- **Explicit, in-the-moment approval** — quote the user's literal words; a paraphrase or an inference from an earlier, related turn doesn't count.
- **(PR only) Code-reviewed** — name the method used and state findings addressed vs. explicitly accepted.

## Worktree Isolation Required for All Work

Same rule as `google-mcp`/`signal-mcp`: before editing any file, use `EnterWorktree` to get an isolated copy of the current branch. Never assume the working tree is clean or matches what was last left — a concurrent session may have uncommitted changes sitting in the shared checkout.

**Caveat:** `EnterWorktree` only creates worktrees for the session's own launch repo, or a repo nested inside it — it cannot target this repo from a session rooted elsewhere (e.g. a `~/brain`-rooted session). A session genuinely rooted here can and should use `EnterWorktree` normally. A session rooted elsewhere uses the sanctioned raw `git worktree add <repo-root>/.claude/worktrees/<name>` workaround instead — see "Worktrees Always Go Through EnterWorktree" in the global CLAUDE.md for the exact procedure. Never commit straight to the shared checkout regardless of which session is doing the work.

## Process miss (2026-08-25): direct commit to `main`, no branch, no worktree

The token-refresh-race fix (`proper-lockfile` cross-process lock + atomic writes) was committed directly onto `main`, one commit ahead of `upstream/main` — no `feat/<name>` branch, no `local-dev`, no worktree, none of the above conventions existing yet at the time. Caught and corrected same day: this file written, `main` reset to a pure mirror of `upstream/main`, the fix moved onto `feat/fix-token-refresh-race` off a newly-created `local-dev`, merged through the proper MR flow. See `_meta/recurring-agent-scripts.md` / `pages/spotify-mcp-server.md` in the brain vault for the full incident writeup — same shape as the `google-mcp` process miss this whole convention set was originally built to prevent.
