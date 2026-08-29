import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDel, apiGet, apiPost, apiPut } from '@/lib/api'
import { queryKeys } from './queryKeys'

// Where a workout happens. The list is written on the setup screen; the
// workouts screen only offers it.

export type WorkoutLocation = { id: number; name: string }

export function useWorkoutLocations(slug: string) {
  return useQuery({
    queryKey: queryKeys.workoutLocations(slug),
    queryFn: () => apiGet<WorkoutLocation[]>(`/api/workout-locations?slug=${slug}`),
    enabled: !!slug,
  })
}

function useLocationWriter<T>(slug: string, send: (input: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutLocations(slug) })
      // A deleted location unassigns the workouts held there, so the workouts
      // screen is showing a venue that no longer exists.
      qc.invalidateQueries({ queryKey: queryKeys.workouts(slug) })
    },
  })
}

export function useAddWorkoutLocation(slug: string) {
  return useLocationWriter(slug, (name: string) => apiPost('/api/workout-locations', { slug, name }))
}

export function useSaveWorkoutLocation(slug: string) {
  return useLocationWriter(slug, ({ id, name }: { id: number; name: string }) =>
    apiPut(`/api/workout-locations/${id}?slug=${slug}`, { name }))
}

export function useDeleteWorkoutLocation(slug: string) {
  return useLocationWriter(slug, (id: number) => apiDel(`/api/workout-locations/${id}?slug=${slug}`))
}
