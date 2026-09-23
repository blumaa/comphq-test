import { describe, expect, it } from 'vitest'
import { parseRosterCsv } from './rosterCsv'

// COM-108 / COM-107. A roster list names, per line, the division or role each
// person goes in. The named column is matched against what exists, never
// created; a blank one takes the sheet's pick.

const DIVISIONS = [{ id: 3, name: 'Rx' }, { id: 4, name: 'Scaled' }]

describe('parseRosterCsv', () => {
  it('matches the named column case-insensitively', () => {
    const { lines, unknown } = parseRosterCsv('Cy Cole, 9, rx\nDi Dean, , Scaled', DIVISIONS, 2, null)
    expect(unknown).toEqual([])
    expect(lines).toEqual([
      { name: 'Cy Cole', cells: ['Cy Cole', '9', 'rx'], refId: 3 },
      { name: 'Di Dean', cells: ['Di Dean', '', 'Scaled'], refId: 4 },
    ])
  })

  it('gives a blank or missing column the fallback', () => {
    const { lines } = parseRosterCsv('Cy Cole, 9,\nDi Dean', DIVISIONS, 2, 4)
    expect(lines.map((l) => l.refId)).toEqual([4, 4])
  })

  it('reports each unknown name once and keeps no line for it', () => {
    const { lines, unknown } = parseRosterCsv('Cy Cole,,Teens\nDi Dean,,teens\nEd Eng,,Rx', DIVISIONS, 2, null)
    expect(unknown).toEqual(['Teens'])
    expect(lines.map((l) => l.name)).toEqual(['Ed Eng'])
  })

  it('skips a header row and nameless lines', () => {
    const { lines } = parseRosterCsv('Name, Bib, Division\n, 4, Rx\nCy Cole', DIVISIONS, 2, null)
    expect(lines.map((l) => l.name)).toEqual(['Cy Cole'])
  })

  it('keeps a quoted comma in a name', () => {
    const { lines } = parseRosterCsv('"Doe, Jane", Rx', DIVISIONS, 1, null)
    expect(lines).toEqual([{ name: 'Doe, Jane', cells: ['Doe, Jane', 'Rx'], refId: 3 }])
  })
})
