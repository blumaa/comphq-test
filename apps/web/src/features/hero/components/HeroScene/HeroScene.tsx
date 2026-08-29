import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { spawnFragments } from '../../fragments'
import { HeroSkeleton } from '../HeroSkeleton/HeroSkeleton'
import '../../hero-art.css'
import styles from './HeroScene.module.css'

// v1: src/app/hero/hero-scene.tsx. A marketing poster with nothing behind it —
// no API call, no slug, and in v1 no inbound link either. The timelines below
// are v1's, moved across unchanged; what changed is everything Next was doing
// around them:
//
//   next/image      → <img> carrying its own intrinsic size, since nothing
//                     else holds the box open now.
//   next/font       → Cinzel is self-hosted and declared in the brand file,
//                     which is where a face belongs.
//   Tailwind        → CSS Modules, including the class the fragments are
//                     given by hand (see fragments.ts).
//
// One element did not come across: v1 draws a white full-screen div, sets it
// to opacity 0 on the first frame and never touches it again. It is only ever
// visible before gsap runs, and the cover is over it when it is.
//
// And one question v1 never asked, which is asked here: whether the reader
// wants any of this. See the media contexts below.

const REQUIRED_IMAGES = 2

function SplitText({ children }: { children: string }) {
  return (
    <span className={styles.line}>
      {children.split('').map((char, i) => (
        <span
          key={i}
          data-letter
          className={char === ' ' ? `${styles.letter} ${styles.space}` : styles.letter}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </span>
  )
}

function createAndAnimateDust(
  containerBehind: HTMLDivElement,
  containerFront: HTMLDivElement,
) {
  for (let i = 0; i < 14; i++) {
    const layer = i < 10 ? containerBehind : containerFront
    const isLarge = i < 4
    const w = isLarge ? 120 + Math.random() * 160 : 60 + Math.random() * 100
    const h = w * (0.3 + Math.random() * 0.4)

    const el = document.createElement('div')
    el.className = styles.mote
    layer.appendChild(el)

    const startX = (0.2 + Math.random() * 0.6) * 100
    const driftX = (Math.random() - 0.5) * 30
    const rise = 20 + Math.random() * 40
    const dur = 3 + Math.random() * 3
    const peakOpacity = isLarge ? 0.4 : 0.3

    gsap.set(el, {
      width: w, height: h,
      backgroundColor: 'rgba(210,175,110,0.3)',
      left: `${startX}%`, top: '100%', opacity: 0,
    })

    const riseVh = rise * (window.innerHeight / 100)

    const tl = gsap.timeline({ repeat: -1, delay: Math.random() * 5 + 2 })
    tl.to(el, { y: -riseVh * 0.4, x: driftX * 0.3, opacity: peakOpacity, duration: dur * 0.2, ease: 'power2.out' })
      .to(el, { y: -riseVh, x: driftX, opacity: peakOpacity * 0.5, duration: dur * 0.4, ease: 'power1.out' })
      .to(el, { y: -riseVh - 20, x: driftX + (Math.random() - 0.5) * 20, opacity: 0, duration: dur * 0.4, ease: 'power1.in' })
      .set(el, { x: 0, y: 0 })
  }

  for (let i = 0; i < 18; i++) {
    const layer = i < 12 ? containerBehind : containerFront
    const r = 1 + Math.random() * 2.5

    const el = document.createElement('div')
    el.className = styles.speck
    layer.appendChild(el)

    const startX = 15 + Math.random() * 70
    const startY = 10 + Math.random() * 70
    const dur = 4 + Math.random() * 6

    gsap.set(el, {
      width: r * 2, height: r * 2,
      backgroundColor: 'rgba(255,230,180,0.6)',
      left: `${startX}%`, top: `${startY}%`, opacity: 0,
    })

    const tl = gsap.timeline({ repeat: -1, delay: Math.random() * 8 + 2.5 })
    tl.to(el, { x: (Math.random() - 0.5) * 8, y: -(3 + Math.random() * 5), opacity: 0.4 + Math.random() * 0.4, duration: dur * 0.3, ease: 'power1.inOut' })
      .to(el, { x: (Math.random() - 0.5) * 12, y: -(6 + Math.random() * 8), opacity: 0.2 + Math.random() * 0.3, duration: dur * 0.4, ease: 'none' })
      .to(el, { opacity: 0, duration: dur * 0.3, ease: 'power1.in' })
      .set(el, { x: 0, y: 0 })
  }
}

export function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const dustBehindRef = useRef<HTMLDivElement>(null)
  const dustFrontRef = useRef<HTMLDivElement>(null)
  const textTopRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)

  const [imagesLoaded, setImagesLoaded] = useState(0)
  const ready = imagesLoaded >= REQUIRED_IMAGES

  const handleImageLoad = useCallback(() => {
    setImagesLoaded((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (!ready) return

    const bg = bgRef.current
    const figure = figureRef.current
    const glow = glowRef.current
    const dustBehind = dustBehindRef.current
    const dustFront = dustFrontRef.current
    const container = containerRef.current
    const textTop = textTopRef.current
    const dim = dimRef.current

    if (!bg || !figure || !glow || !dustBehind || !dustFront || !container || !textTop || !dim) return

    const letters = textTop.querySelectorAll('[data-letter]')

    // gsap animates by writing inline styles frame by frame, so the reduced
    // motion rule MDS declares in base.css — which collapses every CSS
    // animation in the app at once — reaches none of this. gsap.matchMedia is
    // gsap's own answer to that: each branch owns everything created inside
    // it, and the tweens, the dust and the listeners are reverted when the
    // query stops matching or the scene unmounts.
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.set(bg, { opacity: 1 })
      gsap.set(figure, { opacity: 0 })
      gsap.set(dim, { opacity: 1 })
      gsap.set([dustBehind, dustFront, glow], { opacity: 0 })
      gsap.set(letters, { opacity: 0, scaleY: 0.2, scaleX: 1.2 })

      createAndAnimateDust(dustBehind, dustFront)

      const entranceTl = gsap.timeline()
      entranceTl
        .to(dim, { opacity: 0, duration: 2, ease: 'sine.inOut' }, 0.3)
        .to(glow, { opacity: 0.3, duration: 1.5, ease: 'sine.in' }, 0.5)
        .to(figure, { opacity: 1, duration: 0.4, ease: 'power3.out' }, 2.3)
        .to(glow, { opacity: 0.6, duration: 0.8, ease: 'power1.in' }, 2.5)
        .to([dustBehind, dustFront], { opacity: 1, duration: 0.6, ease: 'power1.in' }, 2.6)
        .to(letters, {
          opacity: 1,
          scaleY: 1,
          scaleX: 1,
          duration: 0.2,
          ease: 'power4.out',
          stagger: {
            each: 0.06,
            onComplete: function (this: gsap.core.Tween) {
              this.targets().forEach((t) => spawnFragments(t as Element, 4 + Math.floor(Math.random() * 3)))
            },
          },
        }, 2.8)

      const glowTl = gsap.timeline({ repeat: -1, delay: 4, yoyo: true })
      glowTl
        .to(glow, { opacity: 0.8, scale: 1.05, duration: 3, ease: 'sine.inOut' })
        .to(glow, { opacity: 0.4, scale: 0.95, duration: 3, ease: 'sine.inOut' })

      const quickX = {
        bg: gsap.quickTo(bg, 'x', { duration: 1, ease: 'power2.out' }),
        bgY: gsap.quickTo(bg, 'y', { duration: 1, ease: 'power2.out' }),
        figure: gsap.quickTo(figure, 'x', { duration: 0.8, ease: 'power2.out' }),
        figureY: gsap.quickTo(figure, 'y', { duration: 0.8, ease: 'power2.out' }),
        dustB: gsap.quickTo(dustBehind, 'x', { duration: 1.2, ease: 'power2.out' }),
        dustBY: gsap.quickTo(dustBehind, 'y', { duration: 1.2, ease: 'power2.out' }),
        dustF: gsap.quickTo(dustFront, 'x', { duration: 0.9, ease: 'power2.out' }),
        dustFY: gsap.quickTo(dustFront, 'y', { duration: 0.9, ease: 'power2.out' }),
        text: gsap.quickTo(textTop, 'x', { duration: 0.9, ease: 'power2.out' }),
        textY: gsap.quickTo(textTop, 'y', { duration: 0.9, ease: 'power2.out' }),
      }

      function applyParallax(xPct: number, yPct: number) {
        quickX.bg(xPct * -20)
        quickX.bgY(yPct * -12)
        quickX.figure(xPct * 15)
        quickX.figureY(yPct * 8)
        quickX.dustB(xPct * -10)
        quickX.dustBY(yPct * -7)
        quickX.dustF(xPct * 8)
        quickX.dustFY(yPct * 5)
        quickX.text(xPct * 12)
        quickX.textY(yPct * 6)
      }

      const handleMouseMove = (e: MouseEvent) => {
        const xPct = (e.clientX / window.innerWidth - 0.5) * 2
        const yPct = (e.clientY / window.innerHeight - 0.5) * 2
        applyParallax(xPct, yPct)
      }

      const handleMouseLeave = () => {
        applyParallax(0, 0)
      }

      container.addEventListener('mousemove', handleMouseMove)
      container.addEventListener('mouseleave', handleMouseLeave)

      // The context reverts the tweens it made. The dust are elements it made,
      // and an element is not a tween, so those come out by hand: left behind,
      // they would hang frozen in the air over a poster that has just been
      // asked to stop moving.
      return () => {
        dustBehind.replaceChildren()
        dustFront.replaceChildren()
        container.removeEventListener('mousemove', handleMouseMove)
        container.removeEventListener('mouseleave', handleMouseLeave)
      }
    })

    // The same poster, arrived at rather than travelled to: the dim already
    // lifted, the figure already lit, the letters already set. What is gone is
    // the three things that never stop — the rising dust, the breathing glow,
    // and the parallax that follows the pointer.
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set([bg, figure], { opacity: 1 })
      gsap.set(dim, { opacity: 0 })
      gsap.set(glow, { opacity: 0.6 })
      gsap.set([dustBehind, dustFront], { opacity: 0 })
      gsap.set(letters, { opacity: 1, scaleY: 1, scaleX: 1 })
    })

    return () => mm.revert()
  }, [ready])

  return (
    <div ref={containerRef} className={styles.stage}>
      <div className={styles.backdrop}>
        <img
          src="/hero-background.jpg"
          alt=""
          width={1036}
          height={1264}
          className={styles.backdropImage}
          loading="eager"
          onLoad={handleImageLoad}
        />
      </div>

      <div className={styles.scene}>
        <div ref={bgRef} className={styles.parallax}>
          <img src="/hero-background.jpg" alt="" width={1036} height={1264} className={styles.image} />
        </div>

        <div ref={glowRef} className={styles.glow} />

        <div ref={dustBehindRef} className={styles.dust} />

        <div ref={figureRef} className={styles.figure}>
          <img
            src="/hero-cutout.png"
            alt=""
            width={483}
            height={1082}
            className={styles.figureImage}
            onLoad={handleImageLoad}
          />
        </div>

        <div ref={dustFrontRef} className={styles.dust} />

        <div ref={textTopRef} className={styles.text}>
          <h1 className={styles.title}><SplitText>Rugged Rumble</SplitText></h1>
          <h2 className={styles.subtitle}><SplitText>Gladiator Games</SplitText></h2>
          <p className={styles.date}><SplitText>April 25, 2026</SplitText></p>
        </div>
      </div>

      <div ref={dimRef} className={styles.dim} />

      {/* Last, so it paints over everything without a z-index. */}
      {!ready && <HeroSkeleton />}
    </div>
  )
}
