import { Spinner } from '@mond-design-system/react'
import styles from './HeroSkeleton.module.css'

// v1: src/app/hero/hero-skeleton.tsx, which drew its own spinner out of a
// bordered div. A spinner is the design system's, so the only thing left here
// is the black cover it sits on.
//
// It carries no z-index: it is the last child of the stage, and a later
// sibling paints over an earlier one. v1's z-20 was covering for being first.

export function HeroSkeleton() {
  return (
    <div className={styles.cover}>
      <Spinner label="Loading" />
    </div>
  )
}
