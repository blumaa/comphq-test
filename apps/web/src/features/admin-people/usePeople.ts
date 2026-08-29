import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

// v1: the top half of src/app/[slug]/admin/people/page.tsx. Four reads, one
// labelled error banner, and one `loading` flag both tabs share — lifted out of
// the page because v1's page was 642 lines and the two tabs it hands these to
// are the bulk of them.
//
// Deliberately not four TanStack queries. v1 opens with a single `Promise.all`
// inside `run('Load', …)`, so any one of the four failing costs the screen all
// four and says `Load: …` once. Four independent queries would render three
// working tabs around a silent gap, which is a different screen.

export type Division = { id: number; name: string; order: number }
export type VolunteerRole = { id: number; name: string }
export type Athlete = {
  id: number; name: string; bibNumber: string | null
  divisionId: number | null; division: Division | null; withdrawn: boolean
}
export type Volunteer = { id: number; name: string; roleId: number | null; role: VolunteerRole | null }

export type RunFn = <T>(label: string, op: () => Promise<T>) => Promise<T | undefined>

export function usePeople(slug: string) {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [roles, setRoles] = useState<VolunteerRole[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Every write on both tabs goes through this, so a failure is named by the
  // step that failed rather than by the URL that answered. Returning undefined
  // rather than rethrowing is what lets a caller write `if (!await run(…)) return`.
  const run = useCallback(async function run<T>(label: string, op: () => Promise<T>): Promise<T | undefined> {
    setError(null)
    try { return await op() }
    catch (e) { setError(`${label}: ${e instanceof Error ? e.message : String(e)}`); return undefined }
  }, [])

  const reload = useCallback(async () => {
    // The tabs share this flag, and an empty roster mid-read must not draw as
    // "No athletes yet".
    setLoading(true)
    try {
      await run('Load', async () => {
        const [athleteData, divisionData, volunteerData, roleData] = await Promise.all([
          apiGet<Athlete[]>(`/api/athletes?slug=${slug}`),
          apiGet<Division[]>(`/api/divisions?slug=${slug}`),
          apiGet<Volunteer[]>(`/api/volunteers?slug=${slug}`),
          apiGet<VolunteerRole[]>(`/api/volunteer-roles?slug=${slug}`),
        ])
        setAthletes(athleteData)
        setDivisions(divisionData)
        setVolunteers(volunteerData)
        setRoles(roleData)
      })
    } finally {
      setLoading(false)
    }
  }, [run, slug])

  useEffect(() => { void reload() }, [reload])

  return {
    athletes, divisions, volunteers, roles,
    loading, setLoading, error, setError,
    run, reload, setAthletes, setVolunteers,
  }
}
