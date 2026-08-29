import { Route } from 'react-router'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { currentPath, renderRoutes } from '@/test/harness'
import { CompetitionAdminApp } from './CompetitionAdminApp'

const { apiGet, useSession, signOut } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  useSession: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ apiGet }))
vi.mock('@/lib/session', () => ({ useSession }))

const USER = { id: 'u1', email: 'scorer@comphq.test' }
const MINE = [{ id: 1, name: 'Summer Throwdown', slug: 'summer', role: 'admin' }]

function serve(routes: Record<string, unknown>) {
  apiGet.mockImplementation((path: string) =>
    path in routes ? Promise.resolve(routes[path]) : Promise.reject(new Error(`no fixture for ${path}`)))
}

function mount(entry = '/summer/admin') {
  return renderRoutes(
    <Route path="/:slug/admin" element={<CompetitionAdminApp />}>
      <Route index element={<div>comp dashboard</div>} />
      <Route path="people" element={<div>people</div>} />
    </Route>,
    [entry],
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useSession.mockReturnValue({ user: USER, loading: false, signOut })
  serve({
    '/api/me': { id: 'u1', email: USER.email, isSuper: false },
    '/api/competitions/mine': MINE,
    '/api/logo': { url: null },
  })
})

describe('CompetitionAdminApp', () => {
  it('renders the competition for one of its admins', async () => {
    mount()
    expect(await screen.findByText('comp dashboard')).toBeInTheDocument()
  })

  it('lets a super admin in without a membership row', async () => {
    serve({
      '/api/me': { id: 'u1', email: USER.email, isSuper: true },
      '/api/competitions/mine': [],
      '/api/logo': { url: null },
    })
    mount()
    expect(await screen.findByText('comp dashboard')).toBeInTheDocument()
  })

  // v1 sent the route the visitor was actually on, unlike the site shell.
  it('sends a signed-out visitor to login with the current path as the callback', async () => {
    useSession.mockReturnValue({ user: null, loading: false, signOut })
    mount('/summer/admin/people')
    await waitFor(() =>
      expect(currentPath()).toBe(`/login?callbackUrl=${encodeURIComponent('/summer/admin/people')}`))
  })

  it('names the competition a signed-in stranger has no access to', async () => {
    serve({
      '/api/me': { id: 'u1', email: USER.email, isSuper: false },
      '/api/competitions/mine': [{ id: 2, name: 'Other', slug: 'other', role: 'admin' }],
      '/api/logo': { url: null },
    })
    mount()
    expect(await screen.findByRole('heading', { name: /no access to this competition/i })).toBeInTheDocument()
    expect(screen.getByText('summer')).toBeInTheDocument()
  })

  // role='user' members administer the competition in v1 (defect 3) but do not
  // get the Users link, which is the one screen gated on role='admin'.
  it('hides Users from a role=user member and shows it to an admin', async () => {
    serve({
      '/api/me': { id: 'u1', email: USER.email, isSuper: false },
      '/api/competitions/mine': [{ ...MINE[0], role: 'user' }],
      '/api/logo': { url: null },
    })
    mount()
    await screen.findByText('comp dashboard')
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'People' })).toBeInTheDocument()
  })

  it('shows Users to a role=admin member', async () => {
    mount()
    await screen.findByText('comp dashboard')
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
  })

  it('points the nav at this competition', async () => {
    mount()
    await screen.findByText('comp dashboard')
    expect(screen.getByRole('link', { name: 'People' })).toHaveAttribute('href', '/summer/admin/people')
    expect(screen.getByRole('link', { name: 'Judges' })).toHaveAttribute('href', '/summer/judges')
  })

  it('shows the uploaded logo when there is one', async () => {
    serve({
      '/api/me': { id: 'u1', email: USER.email, isSuper: false },
      '/api/competitions/mine': MINE,
      '/api/logo': { url: 'https://cdn.example/logo.png' },
    })
    mount()
    expect(await screen.findByAltText(/competition logo/i)).toHaveAttribute('src', 'https://cdn.example/logo.png')
  })

  it('signs out and returns to login', async () => {
    mount()
    await screen.findByText('comp dashboard')
    screen.getByRole('button', { name: /sign out/i }).click()
    await waitFor(() => expect(signOut).toHaveBeenCalled())
    await waitFor(() => expect(currentPath()).toBe('/login'))
  })
})
