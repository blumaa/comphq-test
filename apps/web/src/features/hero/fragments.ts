import gsap from 'gsap'
import styles from './fragments.module.css'

// v1: the spawnFragments half of src/app/hero/hero-scene.tsx. Lifted out
// because v1 assigned `frag.className = 'absolute pointer-events-none'` as a
// literal, and a CSS Module class has to be threaded in from a stylesheet
// import instead. The maths below is v1's, unchanged.

export function spawnFragments(letter: Element, count: number) {
  const rect = letter.getBoundingClientRect()
  const parent = letter.parentElement
  if (!parent) return

  const parentRect = parent.getBoundingClientRect()
  const cx = rect.left - parentRect.left + rect.width / 2
  const cy = rect.top - parentRect.top + rect.height / 2

  const frags: HTMLSpanElement[] = []
  const xVals: number[] = []
  const yVals: number[] = []

  for (let i = 0; i < count; i++) {
    const frag = document.createElement('span')
    frag.className = styles.fragment
    parent.appendChild(frag)
    gsap.set(frag, { left: cx, top: cy, width: 2 + Math.random() * 4, height: 2 + Math.random() * 3, backgroundColor: `rgba(255,245,230,${0.5 + Math.random() * 0.4})` })
    frags.push(frag)

    const angle = Math.random() * Math.PI * 2
    const dist = 15 + Math.random() * 40
    xVals.push(Math.cos(angle) * dist)
    yVals.push(Math.sin(angle) * dist + 20)
  }

  gsap.to(frags, {
    x: (i: number) => xVals[i],
    y: (i: number) => yVals[i],
    opacity: 0,
    scale: 0,
    duration: 0.5,
    ease: 'power2.out',
    stagger: 0.02,
    onComplete: () => frags.forEach((f) => f.remove()),
  })
}
