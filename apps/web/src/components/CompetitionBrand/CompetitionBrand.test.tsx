import { Route } from 'react-router'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRoutes } from '@/test/harness'
import { CompetitionBrand } from './CompetitionBrand'

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }))
vi.mock('@/lib/api', () => ({ apiGet }))

function mount(children = <CompetitionBrand />) {
  return renderRoutes(<Route path="/" element={children} />)
}

const lockup = () => screen.getByText('comp').parentElement

beforeEach(() => {
  vi.clearAllMocks()
  apiGet.mockResolvedValue({ url: null })
})

describe('CompetitionBrand', () => {
  it('draws the logo the competition uploaded', async () => {
    apiGet.mockResolvedValue({ url: 'https://cdn.example/logo.png' })
    mount()
    const logo = await screen.findByRole('img', { name: 'Competition logo' })
    expect(logo).toHaveAttribute('src', 'https://cdn.example/logo.png')
  })

  // A bar with a hole in it while a request is in flight is worse than a bar
  // with the wrong mark in it, and the CompHQ lockup is not the wrong mark.
  it('carries the CompHQ lockup until the read answers', () => {
    apiGet.mockImplementation(() => new Promise(() => {}))
    mount()
    expect(lockup()).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Competition logo' })).not.toBeInTheDocument()
  })

  it('keeps the lockup when the competition has uploaded nothing', async () => {
    mount()
    await screen.findByText('hq')
    expect(screen.queryByRole('img', { name: 'Competition logo' })).not.toBeInTheDocument()
  })

  it('keeps the lockup when the read fails outright', async () => {
    apiGet.mockRejectedValue(new Error('logo is down'))
    mount()
    await screen.findByText('hq')
    expect(screen.queryByRole('img', { name: 'Competition logo' })).not.toBeInTheDocument()
  })

  // v1 asked from an effect inside its nav, so every public page fetched it
  // again. It is one shared query now, whoever draws it.
  it('asks for the logo once however many bars draw it', async () => {
    mount(<><CompetitionBrand /><CompetitionBrand /></>)
    await screen.findAllByText('hq')
    expect(apiGet.mock.calls.filter((c) => c[0] === '/api/logo')).toHaveLength(1)
  })
})
