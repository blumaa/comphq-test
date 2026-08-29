#!/usr/bin/env node
// pnpm db:seed — put the fixture into the hosted project so the app has
// something to draw.
//
// The data is tools/golden/seed.sql, the same fixture the golden-master
// differential runs against, because a second hand-written demo seed is a
// second answer to "what does a competition look like" and the two would
// drift. It exercises every screen: two divisions, seven athletes (one
// withdrawn, one with no division), five workouts across two locations,
// heats, scores with DNS gaps, equipment scoped both ways, and a volunteer
// who is not a judge.
//
// Three differences from what db:golden loads locally, all forced by the
// hosted project owning its own auth:
//
//   1. The fixture's three parity rows are dropped. They exist so the
//      differential has a caller with a known id; auth.users on a hosted
//      project belongs to GoTrue, and writing it directly makes an account
//      that cannot sign in.
//   2. --owner names a real account to administer the seeded competition,
//      created through the auth admin API if it is not there yet.
//   3. --today shifts every workout onto the current date. The fixture's
//      dates are fixed so the recorded output is byte-stable; a board with
//      every heat months in the past shows nothing worth looking at.
//
// Modes:
//   --confirm=<ref>             required; the project ref has to be typed
//   --today                     shift the fixture's dates onto today
//   --owner=<email>             give this account the competition
//   --password=<pw>             only used when the account is created

import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { dbUrl, fail, loadEnv, psql, refFrom, root } from './pg.mjs'

const DB_URL = dbUrl()
const ref = refFrom(DB_URL)
const args = process.argv.slice(2)
const has = (flag) => args.includes(flag)
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const sql = (statement) => psql(DB_URL, ['-v', 'ON_ERROR_STOP=1', '-c', statement])

if (value('confirm') !== ref) {
  console.error(
    `Seeding replaces every row in project ${ref}.\n` +
    `Re-run with --confirm=${ref} to proceed. This is deliberate: the ref has\n` +
    `to be typed, so the wrong project cannot be hit by reflex.`,
  )
  process.exit(1)
}

// ─── The fixture, minus the differential's own caller ─────────────────
const FIXTURE = join(root, 'tools/golden/seed.sql')
const text = readFileSync(FIXTURE, 'utf8')
const from = text.indexOf('INSERT INTO auth.users')
const to = text.indexOf('-- Leave the sequences')
if (from === -1 || to === -1 || to < from) {
  fail('parity block', `could not find the parity rows in ${FIXTURE}. Both anchors have to be there:\n` +
    `  INSERT INTO auth.users\n  -- Leave the sequences`)
}
const seed = text.slice(0, from) + text.slice(to)

const loaded = psql(DB_URL, ['-v', 'ON_ERROR_STOP=1', '-f', '-'], seed)
if (!loaded.ok) fail('seed.sql', loaded.out)
console.log(`seeded ${ref} from tools/golden/seed.sql`)

// ─── Dates ────────────────────────────────────────────────────────────
// One whole-day shift applied to both columns, so every interval the fixture
// sets between a call time, a walkout and a heat start survives it.
if (has('--today')) {
  const shifted = sql(`
    WITH d AS (SELECT (CURRENT_DATE - DATE '2026-03-01') AS days)
    UPDATE "Workout" w SET
      "startTime" = w."startTime" + ((SELECT days FROM d) * INTERVAL '1 day'),
      "heatStartOverrides" = COALESCE((
        SELECT jsonb_object_agg(
                 e.key,
                 to_char(((e.value #>> '{}')::timestamptz + ((SELECT days FROM d) * INTERVAL '1 day'))
                           AT TIME ZONE 'UTC',
                         'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
          FROM jsonb_each(w."heatStartOverrides") e), '{}'::jsonb);`)
  if (!shifted.ok) fail('--today', shifted.out)
  console.log('dates shifted onto today')
}

// ─── Owner ────────────────────────────────────────────────────────────
const email = value('owner')
if (email) {
  const env = { ...loadEnv(), ...process.env }
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']) {
    if (!env[key]) fail('owner', `${key} is not set. Put it in comphq-v3/.env.local.`)
  }
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) fail('owner', listErr.message)
  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  let password
  if (!user) {
    password = value('password') ?? randomBytes(9).toString('base64url')
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error) fail('owner', created.error.message)
    user = created.data.user
  }

  // isSuper reaches every competition; the membership row is what the
  // per-competition gate reads, and the two are separate questions in v1.
  const granted = sql(`
    INSERT INTO "UserProfile" (id, "isSuper", "createdAt")
      VALUES ('${user.id}', true, now())
      ON CONFLICT (id) DO UPDATE SET "isSuper" = true;
    INSERT INTO "CompetitionAdmin" ("userId", "competitionId", role, "createdAt")
      VALUES ('${user.id}', 1, 'admin', now())
      ON CONFLICT ("userId", "competitionId") DO UPDATE SET role = 'admin';`)
  if (!granted.ok) fail('owner', granted.out)

  console.log(`${email} administers competition 1${password ? ` (created; password: ${password})` : ''}`)
}

const counts = psql(DB_URL, ['-A', '-F', '\t', '-c', `
  SELECT 'Competition', count(*) FROM "Competition"
  UNION ALL SELECT 'Athlete', count(*) FROM "Athlete"
  UNION ALL SELECT 'Workout', count(*) FROM "Workout"
  UNION ALL SELECT 'HeatAssignment', count(*) FROM "HeatAssignment"
  UNION ALL SELECT 'Score', count(*) FROM "Score";`])
if (counts.ok) console.log(`\n${counts.out.trim()}`)
