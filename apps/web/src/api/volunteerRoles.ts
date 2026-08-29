import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDel, apiGet, apiPost, apiPut } from '@/lib/api'
import { queryKeys } from './queryKeys'

// What a volunteer can be at this competition. Defined on the setup screen;
// the roster and the judge screens only offer the list.

export type VolunteerRole = { id: number; name: string }

export function useVolunteerRoles(slug: string) {
  return useQuery({
    queryKey: queryKeys.volunteerRoles(slug),
    queryFn: () => apiGet<VolunteerRole[]>(`/api/volunteer-roles?slug=${slug}`),
    enabled: !!slug,
  })
}

function useRoleWriter<T>(slug: string, send: (input: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.volunteerRoles(slug) }),
  })
}

export function useAddVolunteerRole(slug: string) {
  return useRoleWriter(slug, (name: string) => apiPost('/api/volunteer-roles', { slug, name }))
}

export function useSaveVolunteerRole(slug: string) {
  return useRoleWriter(slug, ({ id, name }: { id: number; name: string }) =>
    apiPut(`/api/volunteer-roles/${id}?slug=${slug}`, { name }))
}

export function useDeleteVolunteerRole(slug: string) {
  return useRoleWriter(slug, (id: number) => apiDel(`/api/volunteer-roles/${id}?slug=${slug}`))
}
