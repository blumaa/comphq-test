import { describe, it, expect } from 'vitest'
import { envSchema, withPlatformAliases } from './env'

const valid = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhb.service.key',
  SUPABASE_ANON_KEY: 'anon-publishable-key',
  SUPABASE_DB_URL: 'postgres://u:p@localhost:5432/db',
  NODE_ENV: 'test',
}

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

describe('envSchema', () => {
  it('accepts a complete env payload', () => {
    expect(() => envSchema.parse(valid)).not.toThrow()
  })

  it('rejects missing SUPABASE_URL', () => {
    expect(() => envSchema.parse(omit(valid, 'SUPABASE_URL'))).toThrow(/SUPABASE_URL/)
  })

  it('rejects missing SUPABASE_SERVICE_KEY', () => {
    expect(() => envSchema.parse(omit(valid, 'SUPABASE_SERVICE_KEY'))).toThrow(/SUPABASE_SERVICE_KEY/)
  })

  it('rejects missing SUPABASE_ANON_KEY', () => {
    expect(() => envSchema.parse(omit(valid, 'SUPABASE_ANON_KEY'))).toThrow(/SUPABASE_ANON_KEY/)
  })

  it('rejects missing SUPABASE_DB_URL', () => {
    expect(() => envSchema.parse(omit(valid, 'SUPABASE_DB_URL'))).toThrow(/SUPABASE_DB_URL/)
  })

  it('rejects non-URL SUPABASE_URL', () => {
    expect(() => envSchema.parse({ ...valid, SUPABASE_URL: 'not a url' })).toThrow()
  })
})

describe('withPlatformAliases', () => {
  it('fills SUPABASE_SERVICE_KEY from the platform-injected SUPABASE_SERVICE_ROLE_KEY', () => {
    const env = { ...omit(valid, 'SUPABASE_SERVICE_KEY'), SUPABASE_SERVICE_ROLE_KEY: 'role.key' }
    expect(withPlatformAliases(env).SUPABASE_SERVICE_KEY).toBe('role.key')
  })

  it('prefers an explicitly set SUPABASE_SERVICE_KEY', () => {
    const env = { ...valid, SUPABASE_SERVICE_ROLE_KEY: 'role.key' }
    expect(withPlatformAliases(env).SUPABASE_SERVICE_KEY).toBe(valid.SUPABASE_SERVICE_KEY)
  })

  it('leaves the env unchanged when neither key is set', () => {
    const env = omit(valid, 'SUPABASE_SERVICE_KEY')
    expect(withPlatformAliases(env).SUPABASE_SERVICE_KEY).toBeUndefined()
  })
})
