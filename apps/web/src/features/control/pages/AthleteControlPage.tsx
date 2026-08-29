import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  Skeleton,
  Stack,
  Text,
  VisuallyHidden,
  cx,
} from '@mond-design-system/react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useSetAthleteChecks } from '@/api/checks'
import { useChecks, useOps } from '@/api/liveReads'
import { queryKeys } from '@/api/queryKeys'
import { DataPanel } from '@/components/DataPanel/DataPanel'
import { LiveStatus } from '@/components/LiveStatus/LiveStatus'
import { Notice } from '@/components/Notice/Notice'
import { OperatorShell } from '@/layouts/OperatorShell'
import { fmtHeatTime as fmtMs } from '@/lib/heatTime'
import { getHeatMs, type Heat, type OpsData, type WorkoutData } from '@/lib/opsHeats'
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation'
import { useSetHeatTime } from '../api'
import { findConflicts } from '../conflicts'
import styles from './AthleteControlPage.module.css'

// v1: src/components/AthleteControl.tsx, served at /[slug]/control. The desk's
// own screen — the one page on the public side that asks for a sign-in. It
// calls each heat to the corral, walks it out, and moves a start time when the
// floor runs late.
//
// An operator screen: a laptop or tablet on the desk running one job, so it
// keeps the clock in the bar above the table and carries no navigation.

type RowChecks = { corral: boolean; walkout: boolean }

const EMPTY: RowChecks = { corral: false, walkout: false }

export function AthleteControlPage() {
  const { slug = '' } = useParams()
  const { data, dataUpdatedAt, error: opsError } = useOps<OpsData>(slug)
  const workouts = useMemo(() => data?.workouts ?? [], [data])
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null

  const { data: checksData } = useChecks(slug)
  const checks = checksData?.athleteChecks ?? {}
  const setChecks = useSetAthleteChecks(slug)
  const setHeatTime = useSetHeatTime(slug)

  const [expandedHeats, setExpandedHeats] = useState<Set<string>>(new Set())
  const [editingHeat, setEditingHeat] = useState<{ workoutId: number; heatNumber: number } | null>(null)
  const [heatTimeInput, setHeatTimeInput] = useState('')
  const [resetting, setResetting] = useState(false)

  // v1 subscribed to the heats and not to the checks. A tick made on another
  // phone therefore lands with the three-second poll instead of at once, which
  // is fast enough for a box and is kept.
  const realtimeKeys = useMemo(() => [queryKeys.ops(slug)], [slug])
  useRealtimeInvalidation(realtimeKeys)

  const conflicts = useMemo(() => findConflicts(workouts), [workouts])

  function toggleExpand(key: string) {
    setExpandedHeats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function getChecks(key: string): RowChecks {
    return checks[key] ?? EMPTY
  }

  function toggle(key: string, field: keyof RowChecks) {
    setChecks.set({ ...checks, [key]: { ...EMPTY, ...checks[key], [field]: !checks[key]?.[field] } })
  }

  function startEditHeatTime(workout: WorkoutData, heatNumber: number) {
    const ms = getHeatMs(workout, heatNumber)
    if (ms == null) return
    const d = new Date(ms)
    setHeatTimeInput(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    setEditingHeat({ workoutId: workout.id, heatNumber })
  }

  // The heat keeps its day and takes a new hour and minute: the desk is moving
  // a heat by twenty minutes, not to another date. Building it through the
  // local Date constructor is what makes the typed time mean the time on the
  // clock on the wall.
  function saveHeatTime() {
    if (!editingHeat || !heatTimeInput || setHeatTime.isPending) return
    const workout = workouts.find((w) => w.id === editingHeat.workoutId)
    if (!workout) return
    const ms = getHeatMs(workout, editingHeat.heatNumber)
    if (ms == null) return
    const base = new Date(ms)
    const [hh, mm] = heatTimeInput.split(':').map(Number)
    const isoTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm, 0, 0).toISOString()
    setHeatTime.mutate(
      { workoutId: workout.id, heatNumber: editingHeat.heatNumber, isoTime },
      { onSuccess: () => setEditingHeat(null) },
    )
  }

  // v1 drew the heats as a table, and a table keeps its columns at every width
  // and pans when they do not fit — on the phone at the corral gate that pans
  // the heat number itself off the side. A heat here is a thing to act on
  // rather than a row to compare against its neighbours, so it is drawn as
  // one: a list item that stacks on a phone and lines its parts up in columns
  // where there is room for them.
  function heatItem(workout: WorkoutData, heat: Heat) {
    const key = `${workout.id}-${heat.heatNumber}`
    const ms = getHeatMs(workout, heat.heatNumber)
    const c = getChecks(key)
    const open = expandedHeats.has(key)
    const lanes = [...heat.entries].sort((a, b) => a.lane - b.lane)
    const editing =
      editingHeat?.workoutId === workout.id && editingHeat?.heatNumber === heat.heatNumber

    return (
      // Called and walked out: the heat is behind the desk now. v1 faded the
      // row outright, and a fade composites over whatever is under it.
      <li key={heat.heatNumber} className={cx(styles.heat, c.corral && c.walkout && styles.done)}>
        <span className={styles.head}>
          <Text as="span" variant="label" tone="accent">Heat {heat.heatNumber}</Text>
          {heat.isComplete && (
            <Text as="span" variant="meta" tone="success">
              <VisuallyHidden>Complete</VisuallyHidden>✓
            </Text>
          )}
          {/* v1 drew a red border around the row and nothing else, which
              says nothing to a reader who cannot see it. */}
          {conflicts.has(key) && <Badge tone="danger">Overlap</Badge>}
          {lanes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={open}
              aria-controls={`lanes-${key}`}
              onClick={() => toggleExpand(key)}
            >
              Lanes
            </Button>
          )}
        </span>

        {/* The word is the box's own name written where a column header used
            to be, so it is hidden from the reader who has the name already. */}
        <span className={cx(styles.tick, styles.corral)}>
          <Checkbox
            label={`Corral heat ${heat.heatNumber}`}
            labelHidden
            checked={c.corral}
            onChange={() => toggle(key, 'corral')}
          />
          <Text as="span" variant="meta" tone="muted" aria-hidden>Corral</Text>
          <Text as="span" variant="meta" tone="warning" className={c.corral ? styles.struck : undefined}>
            {fmtMs(ms != null ? ms - workout.callTimeSecs * 1000 : null)}
          </Text>
        </span>

        <span className={cx(styles.tick, styles.walkout)}>
          <Checkbox
            label={`Walk Out heat ${heat.heatNumber}`}
            labelHidden
            checked={c.walkout}
            onChange={() => toggle(key, 'walkout')}
          />
          <Text as="span" variant="meta" tone="muted" aria-hidden>Walk Out</Text>
          <Text as="span" variant="meta" tone="accent" className={c.walkout ? styles.struck : undefined}>
            {fmtMs(ms != null ? ms - workout.walkoutTimeSecs * 1000 : null)}
          </Text>
        </span>

        <span className={cx(styles.tick, styles.start)}>
          <Text as="span" variant="meta" tone="muted">Start</Text>
          {editing ? (
            <>
              <Input
                type="time"
                size="sm"
                aria-label={`Heat ${heat.heatNumber} start time`}
                value={heatTimeInput}
                onChange={(e) => setHeatTimeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveHeatTime()
                  if (e.key === 'Escape') setEditingHeat(null)
                }}
                autoFocus
              />
              <Button size="sm" disabled={setHeatTime.isPending} onClick={saveHeatTime}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingHeat(null)}>Cancel</Button>
            </>
          ) : (
            <>
              <Text as="span" variant="meta">{fmtMs(ms)}</Text>
              {ms != null && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit heat ${heat.heatNumber} start time`}
                  onClick={() => startEditHeatTime(workout, heat.heatNumber)}
                >
                  Edit
                </Button>
              )}
            </>
          )}
        </span>

        {open && (
          <ul id={`lanes-${key}`} className={styles.lanes}>
            {lanes.map((e) => (
              <li key={e.athleteId}>
                <Text as="span" variant="meta" tone="accent">
                  <VisuallyHidden>Lane </VisuallyHidden>{e.lane}
                </Text>{' '}
                <Text as="span" variant="meta">{e.athleteName}</Text>
              </li>
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <OperatorShell
      title="Control"
      back={`/${slug}`}
      backLabel="Back to competition"
      context={
        <>
          <LiveStatus updatedAt={lastUpdated} />
          <Button variant="secondary" size="sm" onClick={() => setResetting(true)}>Reset</Button>
        </>
      }
    >
      {/* The tick itself stays where the finger put it — that is deliberate —
          but a write the server refused must be said out loud, or the desk and
          the server quietly disagree until the next poll. */}
      {setChecks.error && (
        <Notice tone="danger">
          Checks not saved: {setChecks.error.message}. The ticks shown here may not have reached the server.
        </Notice>
      )}
      {setHeatTime.error && (
        <Notice tone="danger">
          Heat time not saved: {setHeatTime.error instanceof Error ? setHeatTime.error.message : String(setHeatTime.error)}
        </Notice>
      )}

      {/* A failed read is not an empty desk, and it must not leave the
          skeleton shimmering for ever either. */}
      {!data && opsError && (
        <EmptyState title="Could not load the heats" description={opsError.message} />
      )}

      {/* v1 asked the workout list rather than the query, so a competition
          with no workouts at all says it is loading for ever. */}
      {!data && !opsError && (
        <div aria-busy="true">
          <Stack gap="base">
            <Skeleton lines={8} />
          </Stack>
        </div>
      )}

      {data && workouts.length === 0 && (
        <EmptyState
          title="Nothing to run yet"
          description="Heats appear here once a workout has been built."
        />
      )}

      {workouts.map((workout) => (
        <DataPanel key={workout.id} title={`Workout ${workout.number}: ${workout.name}`} flush>
          {workout.heats.length === 0 ? (
            <Text tone="muted">No heats assigned.</Text>
          ) : (
            <ul className={styles.heats} aria-label={`Workout ${workout.number} heats`}>
              {workout.heats.map((heat) => heatItem(workout, heat))}
            </ul>
          )}
        </DataPanel>
      ))}

      {/* v1 asked with window.confirm, which draws the browser's words rather
          than the app's and interrupts the page rather than the table. */}
      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        onConfirm={() => setChecks.setAsync({})}
        title="Reset all checks?"
        description="Every corral and walk-out tick on every heat is cleared. This cannot be undone."
        confirmLabel="Reset checks"
        cancelLabel="Cancel"
        tone="danger"
      />
    </OperatorShell>
  )
}
