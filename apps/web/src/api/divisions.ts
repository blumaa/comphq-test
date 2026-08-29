import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDel, apiGet, apiPost, apiPut } from '@/lib/api'
import { queryKeys } from './queryKeys'

// The competition's divisions. Written on the setup screen and read almost
// everywhere else — the roster assigns athletes to one, equipment can be
// scoped to one, and the heat running order is division order, lowest first.

export type Division = { id: number; name: string; order: number }

export function useDivisions(slug: string) {
  return useQuery({
    queryKey: queryKeys.divisions(slug),
    queryFn: () => apiGet<Division[]>(`/api/divisions?slug=${slug}`),
    enabled: !!slug,
  })
}

/** Deleting a division unassigns the athletes in it, and its order is the
    order the heats run in, so a write here reaches past its own list. */
function useDivisionWriter<T>(slug: string, send: (input: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.divisions(slug) })
      qc.invalidateQueries({ queryKey: queryKeys.athletes(slug) })
      qc.invalidateQueries({ queryKey: queryKeys.leaderboard(slug) })
    },
  })
}

export function useAddDivision(slug: string) {
  return useDivisionWriter(slug, (input: { name: string; order: number }) =>
    apiPost('/api/divisions', { slug, ...input }))
}

export function useSaveDivision(slug: string) {
  return useDivisionWriter(slug, ({ id, ...body }: { id: number; name: string; order: number }) =>
    apiPut(`/api/divisions/${id}?slug=${slug}`, body))
}

/** Moving a division to a position is a move, not an exchange.
 *
 *  v1 traded order values between the division picked and whoever already held
 *  that position, so sending the first division to third left the old third at
 *  first (defect 23). An exchange only reads as a move when the two are next to
 *  each other; over any greater distance it scatters the rows in between.
 *
 *  The list is rebuilt with the division lifted out and put back where it was
 *  asked for, and the order values the list already used are dealt back out
 *  down it — so a reorder never invents a number and never leaves a gap. Only
 *  the rows whose value actually changed are written, and they go out together,
 *  so the set never lands half-applied.
 *
 *  `rows` must be in the order the list is drawn in, which is what
 *  GET /api/divisions returns.
 */
export function useReorderDivisions(slug: string) {
  return useDivisionWriter(slug, ({ rows, from, to }: { rows: Division[]; from: number; to: number }) => {
    const next = rows.slice()
    next.splice(to, 0, ...next.splice(from, 1))
    const writes = next
      .map((division, i) => ({ division, order: rows[i].order }))
      .filter(({ division, order }) => division.order !== order)
      .map(({ division, order }) =>
        apiPut(`/api/divisions/${division.id}?slug=${slug}`, { order }))
    return Promise.all(writes)
  })
}

export function useDeleteDivision(slug: string) {
  return useDivisionWriter(slug, (id: number) => apiDel(`/api/divisions/${id}?slug=${slug}`))
}
