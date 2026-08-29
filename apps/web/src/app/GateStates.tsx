import { Button, Heading, Screen, ScreenContent, Spinner, Stack, Text } from '@mond-design-system/react'
import type { ReactNode } from 'react'
import { Centered } from '@/components/Centered/Centered'
import styles from './GateStates.module.css'

// The two answers an authorization gate can give before a screen exists. Both
// of v1's admin layouts drew their own copy of each, worded differently for
// the same case.

export function Booting({ label }: { label: string }) {
  return (
    <Screen>
      <Centered as={ScreenContent} className={styles.gate}>
        <Spinner label={label} />
      </Centered>
    </Screen>
  )
}

export function NoAccess({
  title,
  children,
  onSignOut,
}: {
  title: string
  children: ReactNode
  onSignOut: () => void
}) {
  return (
    <Screen>
      <Centered as={ScreenContent} className={styles.gate}>
        <Stack gap="base" align="center">
          <Heading level={1}>{title}</Heading>
          <Text tone="muted">{children}</Text>
          <Button variant="ghost" size="sm" onClick={onSignOut}>Sign out</Button>
        </Stack>
      </Centered>
    </Screen>
  )
}
