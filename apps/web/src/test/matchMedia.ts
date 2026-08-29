// jsdom ships no `window.matchMedia`, and the app asks it two questions the
// stylesheet cannot answer for it: whether the reader has asked for less
// motion (the hero, which gsap drives by writing inline styles frame by frame,
// so the CSS reduced-motion rule reaches none of it) and how wide the viewport
// is (a table that is given fewer columns on a phone, rather than the same
// columns drawn off the side of it).
//
// jsdom has no layout, so a width query is answered from `window.innerWidth`,
// which is the one width in the document a spec can set and the stub can read.
// Anything else — pointer, hover, colour — reports `false`, which is what a
// browser does with a feature it cannot match.

type Listener = (event: MediaQueryListEvent) => void

const REDUCE = '(prefers-reduced-motion: reduce)'
const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'
const WIDTH = /^\(\s*(min|max)-width:\s*(\d+)px\s*\)$/

// jsdom's own default, so a spec that never mentions a viewport gets the
// laptop it has always been getting.
const DEFAULT_WIDTH = 1024

let reduced = false
let width = DEFAULT_WIDTH
const lists = new Set<{ query: string; listeners: Set<Listener> }>()

function evaluate(query: string): boolean {
  if (query === REDUCE) return reduced
  if (query === NO_PREFERENCE) return !reduced
  const match = WIDTH.exec(query)
  if (match) {
    const px = Number(match[2])
    return match[1] === 'min' ? width >= px : width <= px
  }
  return false
}

function announce() {
  for (const { query, listeners } of lists) {
    for (const listener of listeners) {
      listener({ media: query, matches: evaluate(query) } as MediaQueryListEvent)
    }
  }
}

function create(query: string): MediaQueryList {
  const listeners = new Set<Listener>()
  lists.add({ query, listeners })
  return {
    media: query,
    // A getter, because gsap re-reads `matches` off a fresh list when the
    // query changes rather than trusting the value it was handed.
    get matches() { return evaluate(query) },
    onchange: null,
    addListener: (l: Listener) => listeners.add(l),
    removeListener: (l: Listener) => listeners.delete(l),
    addEventListener: (_type: string, l: Listener) => listeners.add(l),
    removeEventListener: (_type: string, l: Listener) => listeners.delete(l),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList
}

function applyWidth() {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
}

export function installMatchMedia() {
  window.matchMedia = ((query: string) => create(query)) as typeof window.matchMedia
  applyWidth()
}

/** Stands in for the OS setting. Set it before rendering: a media context
    picks its branch when it is created. */
export function setReducedMotion(on: boolean) {
  reduced = on
  announce()
}

/** Stands in for the window. Set it before rendering for the viewport a spec
    is about, or during, for a phone that has just been turned on its side. */
export function setViewport(px: number) {
  width = px
  applyWidth()
  announce()
}

/** Back to the default every test starts from: a laptop, and nobody has asked
    for less. */
export function resetMatchMedia() {
  reduced = false
  width = DEFAULT_WIDTH
  lists.clear()
}
