import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeroPage } from './HeroPage'

// The scene pulls gsap and two large images in behind it, and no other route
// wants either, so it loads on demand. v1 did the same with next/dynamic —
// there for want of a DOM at build time, here for want of the bytes.

describe('HeroPage', () => {
  it('shows the cover while the scene is still loading', () => {
    render(<HeroPage />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('draws the scene once it has', async () => {
    render(<HeroPage />)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Rugged Rumble')
  })
})
