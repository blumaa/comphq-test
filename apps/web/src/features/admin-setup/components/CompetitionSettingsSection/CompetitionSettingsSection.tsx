import { Field, Input, Stack, Switch, Text } from '@mond-design-system/react'
import { useState } from 'react'
import { DataPanel } from '@/components/DataPanel/DataPanel'

// v1: the Competition Settings section of src/app/[slug]/admin/setup/page.tsx.
// Every control writes as it is changed; there is no Save button anywhere in
// this section, and there was none in v1 either.
//
// The two toggles are controlled from above, so they move when the write has
// landed. v1 flipped them first and sent the PATCH with no error handling at
// all, which meant a refused write left the switch showing a setting the
// server had never accepted. The failure now reaches the page banner, the same
// forced divergence the rest of this port makes wherever v1 discarded a result.
//
// The two boxes keep their own text while it is being typed and save on blur,
// which is v1's. They are seeded once: v1 read the settings a single time too.

interface Props {
  showBib: boolean
  leaderboardVisibility: 'per_heat' | 'per_workout'
  judgePassword: string
  judgeMaxConsecutive: number
  busy?: boolean
  onPatch: (patch: {
    showBib?: boolean
    leaderboardVisibility?: 'per_heat' | 'per_workout'
    judgePassword?: string
    judgeMaxConsecutive?: number
  }) => Promise<unknown>
}

export function CompetitionSettingsSection({
  showBib, leaderboardVisibility, judgePassword, judgeMaxConsecutive, busy, onPatch,
}: Props) {
  const [password, setPassword] = useState(judgePassword)
  const [consecutive, setConsecutive] = useState(String(judgeMaxConsecutive))

  const perHeat = leaderboardVisibility === 'per_heat'

  // Reported by the page banner; caught so a refused write does not surface as
  // an unhandled rejection from an event handler.
  const patch = (next: Parameters<Props['onPatch']>[0]) => { void onPatch(next).catch(() => {}) }

  function savePassword(value: string) {
    if (!value.trim()) return
    patch({ judgePassword: value.trim() })
  }

  function saveConsecutive(value: number) {
    if (value < 1 || value > 20) return
    patch({ judgeMaxConsecutive: value })
  }

  return (
    <DataPanel
      title="Competition Settings"
      description="Every control here writes as it is changed. There is no Save."
    >
      <Stack gap="base">
        <Stack gap="hairline">
          <Switch
            label="Show Bib Numbers"
            aria-describedby="setup-bib-hint"
            checked={showBib}
            loading={busy}
            onChange={() => patch({ showBib: !showBib })}
          />
          <Text id="setup-bib-hint" variant="note" tone="muted">
            Display bib numbers on the public schedule
          </Text>
        </Stack>

        <Stack gap="hairline">
          <Switch
            label="Live Leaderboard"
            aria-describedby="setup-live-hint"
            checked={perHeat}
            loading={busy}
            onChange={() => patch({ leaderboardVisibility: perHeat ? 'per_workout' : 'per_heat' })}
          />
          <Text id="setup-live-hint" variant="note" tone="muted">
            {perHeat
              ? 'Leaderboard updates after each completed heat'
              : 'Leaderboard only shows after a full workout is completed'}
          </Text>
        </Stack>

        <Field label="Judge Screen Password" hint="Required to open the judge schedule. Admins are never prompted.">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={(e) => savePassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
        </Field>

        <Field
          label="Judge Max Consecutive Heats"
          hint="Highlight violations and cap auto-assignment when a judge exceeds this many heats in a row."
        >
          <Input
            type="number"
            min={1}
            max={20}
            value={consecutive}
            onChange={(e) => setConsecutive(e.target.value)}
            onBlur={(e) => saveConsecutive(Number(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
        </Field>
      </Stack>
    </DataPanel>
  )
}
