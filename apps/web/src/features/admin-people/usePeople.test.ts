import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { usePeople } from './usePeople'

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }))
vi.mock('@/lib/api', () => ({ apiGet }))

// v1: the top half of src/app/[slug]/admin/people/page.tsx — the four reads the
// screen opens with and the one labelled banner every failure lands in.

const ATHLETES = [{ id: 1, name: 'Ann', bibNumber: '7', divisionId: 3, division: null, withdrawn: false }]
const DIVISIONS = [{ id: 3, name: 'Rx', order: 1 }]
const VOLUNTEERS = [{ id: 8, name: 'Jo', roleId: 5, role: null }]
const ROLES = [{ id: 5, name: 'Judge' }]

function serve() {
  apiGet.mockImplementation((path: string) => {
    if (path.startsWith('/api/athletes')) return Promise.resolve(ATHLETES)
    if (path.startsWith('/api/divisions')) return Promise.resolve(DIVISIONS)
    if (path.startsWith('/api/volunteer-roles')) return Promise.resolve(ROLES)
    if (path.startsWith('/api/volunteers')) return Promise.resolve(VOLUNTEERS)
    return Promise.reject(new Error(`unexpected GET ${path}`))
  })
}

async function open() {
  const hook = renderHook(() => usePeople('rugged-rumble'))
  await waitFor(() => expect(hook.result.current.athletes).toHaveLength(1))
  return hook
}

beforeEach(() => {
  vi.clearAllMocks()
  serve()
})

describe('opening the screen', () => {
  it('asks for both rosters and the lists that classify them', async () => {
    await open()
    expect(apiGet.mock.calls.map((c) => c[0])).toEqual([
      '/api/athletes?slug=rugged-rumble',
      '/api/divisions?slug=rugged-rumble',
      '/api/volunteers?slug=rugged-rumble',
      '/api/volunteer-roles?slug=rugged-rumble',
    ])
  })

  it('hands back what each read answered', async () => {
    const { result } = await open()
    expect(result.current.athletes).toEqual(ATHLETES)
    expect(result.current.divisions).toEqual(DIVISIONS)
    expect(result.current.volunteers).toEqual(VOLUNTEERS)
    expect(result.current.roles).toEqual(ROLES)
  })

  // The tabs share this flag, and an empty roster mid-read must not draw as
  // "No athletes yet".
  it('says it is loading while the four reads are out', async () => {
    const resolvers: Array<(rows: unknown[]) => void> = []
    apiGet.mockImplementation(() => new Promise((resolve) => { resolvers.push(resolve) }))
    const { result } = renderHook(() => usePeople('rugged-rumble'))
    await waitFor(() => expect(result.current.loading).toBe(true))
    act(() => resolvers.forEach((resolve) => resolve([])))
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('says which step failed, and lets the banner be dismissed', async () => {
    apiGet.mockRejectedValue(new HttpError(500, 'Database is away'))
    const { result } = renderHook(() => usePeople('rugged-rumble'))
    await waitFor(() => expect(result.current.error).toBe('Load: Database is away'))
    act(() => result.current.setError(null))
    expect(result.current.error).toBeNull()
  })
})

describe('the wrapper every write goes through', () => {
  it('returns what the write returned and clears the last failure', async () => {
    const { result } = await open()
    act(() => result.current.setError('Load: stale'))
    let out: unknown
    await act(async () => { out = await result.current.run('Add athlete', async () => 'saved') })
    expect(out).toBe('saved')
    expect(result.current.error).toBeNull()
  })

  it('labels a failure and answers undefined, so the caller knows not to go on', async () => {
    const { result } = await open()
    let out: unknown = 'untouched'
    await act(async () => {
      out = await result.current.run('Add athlete', () => Promise.reject(new HttpError(409, 'Bib 7 is taken')))
    })
    expect(out).toBeUndefined()
    expect(result.current.error).toBe('Add athlete: Bib 7 is taken')
  })
})

describe('re-reading after a write', () => {
  it('asks all four again', async () => {
    const { result } = await open()
    apiGet.mockClear()
    await act(() => result.current.reload())
    expect(apiGet).toHaveBeenCalledTimes(4)
  })

  it('lets a caller drop one row without a round trip', async () => {
    const { result } = await open()
    act(() => result.current.setAthletes((prev) => prev.filter((a) => a.id !== 1)))
    expect(result.current.athletes).toEqual([])
  })
})
