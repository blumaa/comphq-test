#!/usr/bin/env node
// Re-copy the shared modules from v1, applying the declared mechanical
// rewrites. Running this is how a copy gets made; tools/check-verbatim.mjs is
// how it stays one. Hand-editing a copied file is what this exists to avoid.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const v1 = join(root, '..', 'comphq')
const shared = join(root, 'supabase', 'functions', '_shared')

const relativeTs = (text) => text.replace(/from '(\.[^']*)'/g, (m, spec) =>
  spec.endsWith('.ts') || spec.endsWith('.js') ? m : `from '${spec}.ts'`)

const FILES = [
  ['src/lib/audit.ts', 'audit.ts', relativeTs],
  ['src/lib/workoutEnums.ts', 'workoutEnums.ts', relativeTs],
]

for (const [from, to, transform] of FILES) {
  writeFileSync(join(shared, to), transform(readFileSync(join(v1, from), 'utf8')))
  console.log(`ported ${to}`)
}
