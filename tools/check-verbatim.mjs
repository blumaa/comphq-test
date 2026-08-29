#!/usr/bin/env node
// v2 failed because domain rules were re-derived by hand instead of carried.
// These files are copies of v1 and must stay copies. If one drifts, the port
// stopped being a port. Adapting a file is allowed, but it has to be a
// deliberate edit to ADAPTED below with a stated reason, not a silent diff.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const v1 = join(root, '..', 'comphq')
const functions = join(root, 'supabase', 'functions')
const shared = join(functions, '_shared')

const VERBATIM = [
  ['src/lib/scoring.ts', 'scoring.ts'],
  ['src/lib/heat-reorder.ts', 'heat-reorder.ts'],
  ['src/lib/auth-competition.ts', 'auth-competition.ts'],
  ['src/lib/schemas.ts', 'schemas.ts'],
  ['src/lib/heatTime.ts', 'heatTime.ts'],
  ['src/lib/scoreFormat.ts', 'scoreFormat.ts'],
  ['src/lib/workoutEnums.ts', 'workoutEnums.ts'],
  ['src/lib/heatCompletion.ts', 'heatCompletion.ts'],
  ['src/lib/audit.ts', 'audit.ts'],
  ['src/lib/parseJson.ts', 'parseJson.ts'],
  ['src/lib/rate-limit.ts', 'rate-limit.ts'],
  ['src/lib/datetime.ts', 'datetime.ts'],
  ['src/lib/embeds.ts', 'embeds.ts'],
  ['src/db/schema.ts', 'db/schema.ts'],
  ['src/lib/scoring.test.ts', 'scoring.test.ts'],
  ['src/lib/heat-reorder.test.ts', 'heat-reorder.test.ts'],
  ['src/lib/auth-competition.test.ts', 'auth-competition.test.ts'],
  ['src/lib/parseJson.test.ts', 'parseJson.test.ts'],
  ['src/lib/audit.test.ts', 'audit.test.ts'],
  ['src/lib/scoreFormat.test.ts', 'scoreFormat.test.ts'],
  ['src/lib/heatTime.test.ts', 'heatTime.test.ts'],
  ['src/lib/heatCompletion.test.ts', 'heatCompletion.test.ts'],
  ['src/lib/rate-limit.test.ts', 'rate-limit.test.ts'],
  ['src/lib/datetime.test.ts', 'datetime.test.ts'],
  // The harness the ported specs run against. It drifted once — v1 grew
  // auth.admin.getUserById for the comp-users specs and v3's copy did not —
  // and the specs failed here for a reason that had nothing to do with the port.
  ['src/test/supabase-mock.ts', 'test/supabase-mock.ts'],
  ['src/test/drizzle-mock.ts', 'test/drizzle-mock.ts'],
  ['src/test/setup.ts', 'test/setup.ts'],
]

// Copied into the SPA rather than into the functions, so they are checked
// against v1 from a different base. Neither carries a domain rule: http.ts is
// the wrapper every fetch in the UI goes through, keyNav.ts is the roving
// tabindex contract the tables share. They are copies today, and an unguarded
// copy is exactly the thing that drifts back into a re-derivation.
const VERBATIM_APP = [
  ['src/lib/http.ts', 'src/lib/http.ts'],
  ['src/lib/http.test.ts', 'src/lib/http.test.ts'],
  ['src/lib/keyNav.ts', 'src/lib/keyNav.ts'],
  // Framework-free React: the query defaults are tuned to the live-comp
  // refetch behaviour and the CDN s-maxage on the public reads, so they are
  // behaviour, not setup.
  ['src/lib/QueryProvider.tsx', 'src/lib/QueryProvider.tsx'],
  ['src/lib/keyNav.test.ts', 'src/lib/keyNav.test.ts'],
  // ComphqLogo.tsx was here, and is gone on purpose. It was a copy because a
  // brand that re-points a token has no business re-drawing the podium — but
  // the redesign replaces the identity itself, not the values behind it, and
  // an un-drawn mark cannot be held to v1's drawing of it. Its replacement is
  // src/components/ComphqMark/, which is new work and not a port: no gsap
  // timeline, no text, no raw hex in TSX, and drawn to be read at 40px.
  // Heat clock arithmetic — the same file the functions carry, because both
  // runtimes compute it: the server for /api/ops, the screen for the countdown
  // beside each heat. Two copies of one v1 file, both held to it.
  ['src/lib/heatTime.ts', 'src/lib/heatTime.ts'],
  // Live invalidation. The polling fallback in QueryProvider is what carries a
  // dropped socket, so the two belong to the same behaviour.
  ['src/lib/useRealtimeInvalidation.ts', 'src/lib/useRealtimeInvalidation.ts'],
  // datetime-local to RFC3339. The same file the functions carry, for the same
  // reason heatTime.ts is carried twice: the form produces the value and the
  // zod schema at the other end defines what it has to be.
  // Score parsing and display. The screen types a score and the server ranks
  // it, so the two runtimes have to agree on what "3:12.05" is worth down to
  // the millisecond — the same reason heatTime.ts is carried twice.
  ['src/lib/scoreFormat.ts', 'src/lib/scoreFormat.ts'],
  // Lane maths. v1 computes the moves in the browser and PUTs the result, so
  // the drop the admin sees and the rows the function writes come out of one
  // file. The gesture layer is app-side; this is not.
  ['src/lib/heat-reorder.ts', 'src/lib/heat-reorder.ts'],
  // Draggable registration. Two lines of plugin setup, but registering the
  // plugin twice or not at all is the difference between heat reordering
  // working and silently doing nothing.
  ['src/lib/gsap-client.ts', 'src/lib/gsap-client.ts'],
  // The score inputs hook: plain React over ported rules — scoreFormat for
  // what a typed score is worth. Its sibling useWorkoutDetail.ts is ADAPTED
  // below; useWorkoutDetail.mutations.ts is the file they import and is NOT a
  // copy — it is where the same-origin fetch became the cross-origin seam.
  ['src/hooks/useScoreInputs.ts', 'src/features/workout-detail/useScoreInputs.ts'],
  // Drop-target geometry for heat reordering. Framework-free DOM measurement,
  // and the rules for which row a pointer landed on are not obvious enough to
  // re-derive.
  ['src/components/workout-detail/heat-dnd-context.tsx', 'src/features/workout-detail/components/heat-dnd-context.tsx'],
  ['src/lib/datetime.ts', 'src/lib/datetime.ts'],
  ['src/lib/datetime.test.ts', 'src/lib/datetime.test.ts'],
]

// Adapted on purpose. Each entry states why, so a reviewer can judge it.
const ADAPTED = {
  'db.ts': "v1's lazy Proxy existed only to survive Next's build-time prerender; Deno driver + prepare:false for the transaction pooler",
  'supabase.ts': 'service-role client built lazily from getEnv() instead of module-load env',
  'competition.ts': "React cache() replaced with request-scoped AsyncLocalStorage; a module-level cache would leak across tenants",
  'env.ts': 'server-only schema, lazy parse; NEXT_PUBLIC_* are the SPA\'s config, not the server\'s',
  'env.test.ts': 'follows env.ts — pins config var names, carries no domain rule',
  'supabase-server.ts': 'rewritten: Edge Functions carry the token on the Authorization header, not a next/headers cookie',
  'request-context.ts': 'new: replaces Next ambient per-request state',
  'useWorkoutDetail.ts': 'v1 bounced the admin to the list on any load failure and swallowed rejections behind ConfirmDialogs; now only a 404 redirects, dialog actions rethrow so the prompt holds open, and refresh sets loading/error state',
}

// Mechanical rewrites applied to v1's text before comparing, so the copy is
// still checked byte for byte everywhere else.
//
// Deno resolves relative specifiers as URLs and will not guess an extension,
// while Node and the bundler v1 runs under both will. Aliased specifiers are
// handled by the import map in supabase/functions/deno.json; a relative one
// cannot be, because an import map is only consulted for bare specifiers.
// Rather than hand-edit two copied files and lose the guarantee, the rewrite
// is declared here and applied by tools/port-shared.mjs.
const TRANSFORMS = {
  'relative-ts': (text) => text.replace(/from '(\.[^']*)'/g, (m, spec) =>
    spec.endsWith('.ts') || spec.endsWith('.js') ? m : `from '${spec}.ts'`),
}

// v1 split its Supabase clients by runtime: supabase-client.ts for the browser,
// supabase-server.ts for a request. v3's SPA has one, src/lib/supabase.ts, so
// the specifier is rewritten rather than the file edited.
TRANSFORMS['supabase-client'] = (text) =>
  text.replace(/from '\.\/supabase-client'/g, "from './supabase'")

const TRANSFORMED = {
  'audit.ts': ['relative-ts'],
  'workoutEnums.ts': ['relative-ts'],
  'src/lib/useRealtimeInvalidation.ts': ['supabase-client'],
}

// Deliberately deleted from an otherwise verbatim file. The block is removed
// from v1's text before comparing, so every other line still has to match and
// an edit to the block itself surfaces here rather than being absorbed.
const REMOVED = {
  'db/schema.ts': [{
    reason: 'v1 declares CompetitionMember only so drizzle-kit generate does not emit a DROP for it. v3 has no drizzle-kit — the SQL migrations are the schema — and migration 20260422000000 drops the table, so the declaration would assert a table that does not exist.',
    block: `// Legacy — ghost table left over from the roles_v2 migration rename. Kept
// here so drizzle-kit generate doesn't try to drop it. No app code uses it.
export const competitionMember = pgTable('CompetitionMember', {
  userId: uuid('userId').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  competitionId: integer('competitionId').notNull().references(() => competition.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('scorekeeper'),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.competitionId] }),
])

`,
  }],
}

// Whole trees that mirror v1 file for file. The route handlers are copies:
// none of them import next/server, so the only Next-specific thing about them
// is how the framework called them, and that lives in the routers instead.
// Checking the tree rather than a hand-written list means a route added to v1,
// or one quietly left behind here, shows up as a failure instead of a gap.
const VERBATIM_TREE = [
  ['src/app/api', 'supabase/functions/_routes'],
]

function walk(dir, base = dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name)
    return e.isDirectory() ? walk(full, base) : [relative(base, full)]
  })
}

if (!existsSync(v1)) {
  console.error(`v1 not found at ${v1} — cannot verify the port.`)
  process.exit(1)
}

let failed = 0
const GROUPS = [[VERBATIM, shared], [VERBATIM_APP, join(root, 'apps', 'web')]]
for (const [pairs, base] of GROUPS) for (const [from, to] of pairs) {
  const a = join(v1, from)
  const b = join(base, to)
  if (!existsSync(b)) {
    console.error(`MISSING  ${to}`)
    failed++
    continue
  }
  let expected = readFileSync(a, 'utf8')
  for (const name of TRANSFORMED[to] ?? []) expected = TRANSFORMS[name](expected)
  for (const { block } of REMOVED[to] ?? []) {
    if (!expected.includes(block)) {
      console.error(`STALE    ${to}  (a REMOVED block no longer appears in v1 ${from})`)
      failed++
    }
    expected = expected.replace(block, '')
  }
  if (expected !== readFileSync(b, 'utf8')) {
    console.error(`DRIFTED  ${to}  (must match v1 ${from} byte-for-byte)`)
    failed++
  }
}

let treeFiles = 0
for (const [from, to] of VERBATIM_TREE) {
  const a = join(v1, from)
  const b = join(root, to)
  const inV1 = walk(a).sort()
  const inV3 = walk(b).sort()

  for (const f of inV1) {
    if (!inV3.includes(f)) {
      console.error(`MISSING  ${to}/${f}  (v1 has ${from}/${f})`)
      failed++
      continue
    }
    if (readFileSync(join(a, f), 'utf8') !== readFileSync(join(b, f), 'utf8')) {
      console.error(`DRIFTED  ${to}/${f}  (must match v1 ${from}/${f} byte-for-byte)`)
      failed++
    }
    treeFiles++
  }
  for (const f of inV3.filter((f) => !inV1.includes(f))) {
    console.error(`EXTRA    ${to}/${f}  (no such file in v1 ${from})`)
    failed++
  }
}

if (failed) {
  console.error(`\n${failed} file(s) drifted from v1. Either revert the edit, or move the file to ADAPTED in tools/check-verbatim.mjs with a reason.`)
  process.exit(1)
}
console.log(`verbatim: ${VERBATIM.length + VERBATIM_APP.length} files match v1 (${VERBATIM_APP.length} of them app-side)`)
console.log(`adapted:  ${Object.keys(ADAPTED).length} files, each with a stated reason`)
console.log(`removed:  ${Object.values(REMOVED).flat().length} block(s) deleted on purpose`)
console.log(`trees:    ${treeFiles} files mirror v1 file for file`)
console.log(`rewrites: ${Object.keys(TRANSFORMED).length} file(s) carry a declared mechanical rewrite`)
