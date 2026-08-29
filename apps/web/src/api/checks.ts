import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPatch } from '@/lib/api'
import type { ChecksData } from './liveReads'
import { queryKeys } from './queryKeys'

// The two check writers. v1 had one in AthleteControl and one in EquipmentView,
// each a hand-rolled fetch with its own copy of the optimistic cache write, and
// they had already drifted — one spread the old value over the new record, the
// other did not.
//
// Both are written to the cache first and sent after, because the person
// ticking them is standing on the floor and the box has to move under their
// finger. PATCH /api/checks has no auth at all (defect 2). v1 sent it with a
// bare fetch and never looked at the answer; this keeps that — no rollback, no
// refetch — with the request owned by a mutation rather than dropped on the
// floor, so a rejected write settles somewhere instead of becoming an unhandled
// rejection.

export type AthleteChecks = ChecksData['athleteChecks']
export type EquipChecks = ChecksData['equipChecks']

function useChecksWriter<T>(
  slug: string,
  type: 'athlete' | 'equipment',
  place: (old: ChecksData | undefined, next: T) => ChecksData,
) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (checks: T) => apiPatch('/api/checks', { slug, type, checks }),
  })

  const write = (next: T) =>
    qc.setQueryData(queryKeys.checks(slug), (old: ChecksData | undefined) => place(old, next))

  return {
    /** Cache-first tick: the box moves under the finger, the request follows. */
    set: (next: T) => {
      write(next)
      mutation.mutate(next)
    },
    /**
     * Same cache-first write, but the caller gets the real promise — the reset
     * ConfirmDialog needs the rejection to hold the prompt open. The cleared
     * ticks stay on screen either way; the next poll is what corrects them.
     */
    setAsync: (next: T) => {
      write(next)
      return mutation.mutateAsync(next)
    },
    /** Last write's refusal, for the screens to warn with. */
    error: mutation.error,
    isPending: mutation.isPending,
  }
}

/** Corral and walk-out ticks, keyed `${workoutId}-${heatNumber}`. */
export function useSetAthleteChecks(slug: string) {
  return useChecksWriter<AthleteChecks>(slug, 'athlete', (old, next) => ({
    athleteChecks: next,
    equipChecks: old?.equipChecks ?? {},
  }))
}

/** Equipment ticks, keyed `${workoutId}-${heatNumber}-${divisionName}`. */
export function useSetEquipChecks(slug: string) {
  return useChecksWriter<EquipChecks>(slug, 'equipment', (old, next) => ({
    athleteChecks: old?.athleteChecks ?? {},
    equipChecks: next,
  }))
}
