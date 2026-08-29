import { lazy, Suspense } from 'react'
import { HeroSkeleton } from '../components/HeroSkeleton/HeroSkeleton'
import styles from './HeroPage.module.css'

// v1: src/app/hero/page.tsx, which loaded the scene through next/dynamic with
// ssr: false because it touches the DOM on mount. There is no server render to
// opt out of here, but the split is worth keeping on its own terms: the scene
// pulls gsap and half a megabyte of artwork, and no other route wants either.
//
// The redesign left this poster alone, deliberately. It is not the product's
// identity to restate: it is one event's poster — a named competition, a date
// and a photograph — and it shares no surface with the app, no shell, no nav
// and no chrome. Recolouring a firelit photograph into the app's cyan and
// amber would be replacing a customer's poster with the app's own, and the
// values it is composed from stay quarantined in hero-art.css, which is the
// one stylesheet check:tokens exempts.
//
// What did change is the motion; see HeroScene.

const HeroScene = lazy(() =>
  import('../components/HeroScene/HeroScene').then((m) => ({ default: m.HeroScene })),
)

export function HeroPage() {
  return (
    <div className={styles.stage}>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroScene />
      </Suspense>
    </div>
  )
}
