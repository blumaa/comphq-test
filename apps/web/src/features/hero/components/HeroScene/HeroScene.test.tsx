import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { setReducedMotion } from '@/test/matchMedia'
import { HeroScene } from './HeroScene'
import styles from './HeroScene.module.css'

// v1: src/app/hero/hero-scene.tsx. A marketing poster, reachable only by
// typing the URL. Nothing here reads the API, so what a test can hold it to
// is the poster it draws and the order it draws it in — the animation itself
// is gsap's and is not re-asserted here.

function images(): HTMLImageElement[] {
  return [...document.querySelectorAll('img')]
}

/** The two images the entrance waits on: the blurred backdrop and the figure. */
function loadGatingImages() {
  fireEvent.load(backdrop())
  fireEvent.load(images().find((img) => img.getAttribute('src') === '/hero-cutout.png')!)
}

/** The blurred fill behind the scene, which is the first of the two. */
function backdrop(): HTMLImageElement {
  return images().find((img) => img.getAttribute('src') === '/hero-background.jpg')!
}

/** The black sheet the entrance lifts off the poster. */
function dim(): HTMLElement {
  return document.querySelector(`.${styles.dim}`) as HTMLElement
}

/** The dust and the sparks, which are the parts that never settle. */
function motes(): Element[] {
  return [...document.querySelectorAll(`.${styles.mote}, .${styles.speck}`)]
}

describe('HeroScene', () => {
  it('covers the scene until the images it animates have arrived', () => {
    render(<HeroScene />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('keeps covering it while only one of the two has arrived', () => {
    render(<HeroScene />)
    fireEvent.load(images()[0])
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('uncovers it once both have', () => {
    render(<HeroScene />)
    loadGatingImages()
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument()
  })

  // Read by content rather than by accessible name: every character is its
  // own inline element, and a name computed from those comes out with the
  // spaces dropped. That is v1's markup and v1's defect, logged as 18.
  it('draws the three lines of the poster', () => {
    const { container } = render(<HeroScene />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rugged Rumble')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Gladiator Games')
    expect(container.querySelector('p')).toHaveTextContent('April 25, 2026')
  })

  // Every character animates on its own, so every character is its own span.
  it('splits a line into one element per character, spaces included', () => {
    render(<HeroScene />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.querySelectorAll('[data-letter]')).toHaveLength('Rugged Rumble'.length)
  })

  it('leaves the artwork out of the accessibility tree', () => {
    render(<HeroScene />)
    expect(images()).not.toHaveLength(0)
    expect(images().every((img) => img.getAttribute('alt') === '')).toBe(true)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  // A SPA has no image component holding the box open, so the intrinsic size
  // is written on the tag: the scene is sized against the backdrop's own
  // 1036x1264 and a late reflow would move the figure out of the frame.
  it('carries the intrinsic size of every image it draws', () => {
    render(<HeroScene />)
    expect(images().every((img) => Number(img.getAttribute('width')) > 0 && Number(img.getAttribute('height')) > 0)).toBe(true)
  })

  // The backdrop is the first paint of the page, so it does not wait for the
  // lazy-loading heuristic to decide it is visible.
  it('fetches the backdrop eagerly', () => {
    render(<HeroScene />)
    expect(backdrop()).toHaveAttribute('loading', 'eager')
  })
})

// Every other animation in the app is CSS, and MDS collapses those from one
// rule in base.css. This one is gsap, which writes inline styles frame by
// frame, so no stylesheet reaches it and the scene has to ask for itself.
describe('HeroScene and the OS motion setting', () => {
  it('rises with dust and sparks when nobody has asked for less', () => {
    render(<HeroScene />)
    loadGatingImages()
    expect(motes()).toHaveLength(32)
  })

  it('spawns nothing that keeps moving when they have', () => {
    setReducedMotion(true)
    render(<HeroScene />)
    loadGatingImages()
    expect(motes()).toHaveLength(0)
  })

  // Still the poster, still lit — it is arrived at rather than travelled to.
  it('shows the poster instead of fading up to it', () => {
    setReducedMotion(true)
    render(<HeroScene />)
    loadGatingImages()
    expect(dim()).toHaveStyle({ opacity: '0' })
  })
})
