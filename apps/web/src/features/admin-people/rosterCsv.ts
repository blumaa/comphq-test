import { parseCsv } from '@/lib/csv'

// A pasted or dropped roster: one person per line, name first. `column` is
// the cell naming the division or role; it is looked up, never created.

export interface RosterLine {
  name: string
  cells: string[]
  refId: number | null
}

export function parseRosterCsv(
  text: string,
  refs: { id: number; name: string }[],
  column: number,
  fallback: number | null,
): { lines: RosterLine[]; unknown: string[] } {
  const byName = new Map(refs.map((r) => [r.name.toLowerCase(), r.id]))
  const rows = parseCsv(text)
  if (rows[0]?.[0].toLowerCase() === 'name') rows.shift()
  const lines: RosterLine[] = []
  const unknown = new Map<string, string>()
  for (const cells of rows) {
    const [name] = cells
    if (!name) continue
    const ref = cells[column] ?? ''
    if (!ref) { lines.push({ name, cells, refId: fallback }); continue }
    const id = byName.get(ref.toLowerCase())
    if (id === undefined) unknown.set(ref.toLowerCase(), unknown.get(ref.toLowerCase()) ?? ref)
    else lines.push({ name, cells, refId: id })
  }
  return { lines, unknown: [...unknown.values()] }
}
