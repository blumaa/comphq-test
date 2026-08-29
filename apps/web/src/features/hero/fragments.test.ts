import { describe, expect, it } from 'vitest'
import { spawnFragments } from './fragments'

// The burst a letter throws off as it lands. It is drawn by creating spans
// rather than by rendering them, so this is the one part of the scene whose
// class name is threaded in by hand and can therefore go missing.

function letter(): HTMLElement {
  const parent = document.createElement('div')
  const span = document.createElement('span')
  span.textContent = 'R'
  parent.appendChild(span)
  document.body.appendChild(parent)
  return span
}

describe('spawnFragments', () => {
  it('throws the asked-for number of pieces off the letter', () => {
    const span = letter()
    spawnFragments(span, 4)
    expect(span.parentElement!.querySelectorAll('span:not(:first-child)')).toHaveLength(4)
  })

  it('gives every piece the class the stylesheet positions it by', () => {
    const span = letter()
    spawnFragments(span, 3)
    const frags = [...span.parentElement!.children].slice(1)
    expect(frags.every((f) => f.className.length > 0)).toBe(true)
    expect(new Set(frags.map((f) => f.className)).size).toBe(1)
  })

  it('clears the pieces away once the burst has finished', async () => {
    const span = letter()
    spawnFragments(span, 3)
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(span.parentElement!.children).toHaveLength(1)
  }, 3000)

  // A letter is only ever in the DOM here, but the guard is v1's and a
  // detached node would otherwise throw inside an animation callback.
  it('does nothing for a letter with no parent to draw into', () => {
    const orphan = document.createElement('span')
    expect(() => spawnFragments(orphan, 3)).not.toThrow()
  })
})
