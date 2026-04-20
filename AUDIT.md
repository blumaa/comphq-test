# comphq — MVP Audit & Remediation Plan

Two independent audit passes (code quality + security) on 2026-04-20. Verdict: MVP foundation is sound, but **not ready for real organizers**. Ship the items below in order — not all at once.

## 🔴 Ship-stoppers (do before giving anyone the URL)

- [ ] **SVG XSS in logo upload** — `src/app/api/logo/route.ts:22`
  Drop `image/svg+xml` from the allowlist; add magic-byte check + size cap (~2 MB).
- [ ] **Hardcoded `admin`/`crossfit123` fallback** — `src/lib/auth.ts:9-12`
  Fail closed in production if `ADMIN_PASSWORD` env is unset. Force first-login password change.
- [ ] **No login rate limit** — trivial brute force given the known default
  Add Upstash/middleware on `/api/auth/callback/credentials` (~5/min/IP). Raise password min to 12 chars.
- [ ] **Every authed user is admin** — one scorekeeper can nuke the DB
  Add `role` column to `User`. Gate `/api/users/*`, bulk deletes, `/api/logo`, `/api/settings` behind `requireAdmin()`.
- [ ] **Heat-completion race** — `src/app/api/workouts/[id]/heats/[heatNum]/complete/route.ts:17-70`
  Read-modify-write on `completedHeats` text column drops concurrent completions. Move to `jsonb` + Postgres RPC, or normalize to a `CompletedHeat` rows table.

## 🟠 Serious (before a real competition runs on it)

- [ ] **Zero input validation** — every route does `as { ... }` on `req.json()`
  Adopt zod, parse at the boundary of every route. Highest leverage single change.
- [ ] **CSV import: OOM + non-transactional** — `src/app/api/import/heats/route.ts:44-147`
  Cap upload size (~5 MB), wrap per-workout delete+insert in a Postgres RPC/transaction.
- [ ] **Assignments `delete` then `insert` not transactional** — `src/app/api/workouts/[id]/assignments/route.ts:63-69`
  Same pattern; wrap in RPC.
- [ ] **`showBib=false` still leaks bib numbers in JSON** — `/api/schedule`, `/api/ops`
  Strip `bibNumber` server-side when the setting is off.
- [ ] **`calculateRankings` races `saveAllScores`** — `src/app/admin/workouts/[id]/page.tsx:395-402`
  UI fires N parallel score POSTs then hits `/calculate` which reads the Score table. Chain properly or pass payload to `/calculate`.
- [ ] **Athlete delete cascades silently** — migration `ON DELETE CASCADE` on Scores + HeatAssignments
  Add explicit confirmation in admin UI, or implement soft-delete.
- [ ] **`partBPoints` not cleared on heat-undo** — `src/app/api/workouts/[id]/heats/[heatNum]/complete/route.ts:97`
  Null both `points` and `partBPoints`.
- [ ] **Username-enumeration timing oracle** — `src/lib/auth.ts:32-34`
  Short-circuits before bcrypt when user missing. Run dummy compare always.
- [ ] **No session maxAge** — defaults to 30 days with no re-auth
  Set `session.maxAge` to ~8h. Add `jwt`/`session` callbacks to carry `user.id`.
- [ ] **Missing security headers** — `next.config.ts`
  Add `headers()` returning strict CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`.
- [ ] **Module-level supabase client with service-role key** — `src/lib/supabase.ts`
  One accidental `'use client'` import leaks the key. Add `import 'server-only'`; rename `supabase.server.ts`.

## 🟡 Cleanup (tech debt PR)

- [ ] **`puppeteer` is in `dependencies` but never imported** — `package.json:22`
  ~350 MB of Chromium shipped to every deploy. Delete.
- [ ] **Workout detail page is 1009 lines, 18 pieces of state** — `src/app/admin/workouts/[id]/page.tsx`
  Split into `<HeatsTable>`, `<ScoreInputRow>`, `<EditSettingsForm>`.
- [ ] **Bulk athlete add = N sequential POSTs** — `src/app/admin/athletes/page.tsx:79-88`
  Make `POST /api/athletes` accept array body; one `insert(array).select()`.
- [ ] **`JSON.parse` of text columns** — migrate `completedHeats` + `heatStartOverrides` to `jsonb`
- [ ] **Missing indexes**: `HeatAssignment(workoutId, heatNumber)`, `Score(workoutId)`
- [ ] **Duplicated helpers across pages**: `fmtTime`, `TimeInput`, `statusColor`, ranking/partB logic, five time-parsing functions, `ATHLETE_WITH_DIVISION` embed string. Extract to `src/lib/` + `src/components/`.
- [ ] **`src/lib/types.ts` is dead code** — routes inline their own types. Adopt everywhere or delete.
- [ ] **`setInterval` polls don't pause on hidden tabs** — public/ops/athlete-control pages. Guard with `document.visibilityState`.
- [ ] **Toggles are `<div onClick>`** — not keyboard accessible. Use `<button role="switch" aria-checked>` or a real `<input type="checkbox">`.
- [ ] **`eslint-disable` on `useEffect` deps** — violates the repo's own rule. Fix with `useRef(router)`.

## 🟢 Nice to have

- [ ] Audit columns (`updated_by`, `updated_at`) on mutable tables. Useful when a score is disputed.
- [ ] CSV export of the leaderboard — common organizer ask.
- [ ] Bump bcrypt rounds 10 → 12 once login latency budget allows (~50ms extra).
- [ ] Optimistic updates on admin list pages (saves one RTT of perceived latency per mutation).
- [ ] React 19 `use()` to replace the `fetch → setState → useEffect` dance across every page.

## Suggested PR order

1. **`chore/drop-puppeteer`** — 30 seconds, removes 350 MB from builds.
2. **`security/hardening-1`** — items under 🔴 Ship-stoppers as one commit.
3. **`security/zod-validation`** — item #6 under 🟠. Unblocks cleanup of many other bugs.
4. **`fix/race-conditions`** — items 7, 8, 10.
5. **`fix/data-integrity`** — items 9, 11, 12.
6. **`security/hardening-2`** — items 13, 14, 15, 16.
7. **`refactor/cleanup`** — all 🟡 items as a single PR.
8. 🟢 items as and when.

## Re-audit after

After the 🔴 + 🟠 blocks land, re-run both audits before inviting external users. Bottom line from the security agent: "any one of these a bored attendee could find in ten minutes — combine into a trivial full-takeover chain. Fix the top five, then re-audit."
