import { useCallback, useEffect, useState } from 'react'
import { apiDel, apiGet, apiPost } from '@/lib/api'

// v1: the judge half of src/app/[slug]/admin/workouts/[id]/page.tsx, lifted out
// of the page because the page is already the largest file in this slice. The
// requests, their order and their swallowed failure are v1's.
//
// One departure: v1 read `/api/settings` in the same Promise.all to find the
// consecutive-heat limit, which meant a failed settings read also cost the
// screen its judges. The limit is a competition-wide setting several screens
// share, so it comes from the settings query and is passed to `generate`.

export type Judge = { id: number; name: string }
export type JudgeAssignment = {
  id: number; volunteerId: number; heatNumber: number; lane: number; judgeName: string
}
export type LaneJudge = { volunteerId: number; assignmentId: number; judgeName: string }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function useWorkoutJudges(workoutId: string, slug: string) {
  const [judges, setJudges] = useState<Judge[]>([])
  const [volunteers, setVolunteers] = useState<Judge[]>([])
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([])
  const [error, setError] = useState<string | null>(null)

  const base = `/api/workouts/${workoutId}/judge-assignments?slug=${slug}`

  const load = useCallback(async () => {
    try {
      const [rows, roles, vols] = await Promise.all([
        apiGet<JudgeAssignment[]>(`/api/workouts/${workoutId}/judge-assignments?slug=${slug}`),
        apiGet<{ id: number; name: string }[]>(`/api/volunteer-roles?slug=${slug}`),
        apiGet<{ id: number; name: string; roleId: number | null }[]>(`/api/volunteers?slug=${slug}`),
      ])
      const judgeRoleIds = new Set(roles.filter((r) => r.name.toLowerCase() === 'judge').map((r) => r.id))
      setJudges(vols.filter((v) => v.roleId != null && judgeRoleIds.has(v.roleId)))
      setVolunteers(vols)
      setAssignments(rows)
    } catch {
      // v1 called this non-critical: the scores half of the screen works
      // without it, so a failed read leaves the lanes unjudged and silent.
    }
  }, [workoutId, slug])

  useEffect(() => { void load() }, [load])

  /** A null volunteer empties the lane; anything else claims it. */
  const setJudge = useCallback(async (heatNumber: number, lane: number, volunteerId: number | null) => {
    setError(null)
    if (volunteerId === null) {
      const existing = assignments.find((a) => a.heatNumber === heatNumber && a.lane === lane)
      if (!existing) return
      try {
        await apiDel(base, { ids: [existing.id] })
        setAssignments((prev) => prev.filter((a) => a.id !== existing.id))
      } catch (e) { setError(message(e)) }
      return
    }
    try {
      await apiPost(base, { volunteerId, heatNumber, lane })
      await load()
    } catch (e) { setError(message(e)) }
  }, [assignments, base, load])

  // generate and clear rethrow after recording the error: both can run behind
  // a ConfirmDialog, which needs the real rejection to hold the prompt open,
  // while the error state serves the direct, non-dialog call.
  const generate = useCallback(async (maxConsecutive: number) => {
    setError(null)
    try {
      const rows = await apiPost<JudgeAssignment[]>(
        `/api/workouts/${workoutId}/judge-assignments/generate?slug=${slug}`,
        { maxConsecutive },
      )
      setAssignments(rows)
    } catch (e) { setError(message(e)); throw e }
  }, [workoutId, slug])

  const clear = useCallback(async () => {
    try {
      // No body: a DELETE that carries one names the assignments to remove,
      // and an absent body is what means "all of them".
      await apiDel(base)
      setAssignments([])
    } catch (e) { setError(message(e)); throw e }
  }, [base])

  const judgesByLane = useCallback((heatNumber: number) => new Map<number, LaneJudge>(
    assignments
      .filter((a) => a.heatNumber === heatNumber)
      .map((a) => [a.lane, { volunteerId: a.volunteerId, assignmentId: a.id, judgeName: a.judgeName }]),
  ), [assignments])

  return {
    judges, volunteers, assignments, error,
    dismissError: useCallback(() => setError(null), []),
    setJudge, generate, clear, judgesByLane,
  }
}
