import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

describe('supabase client', () => {
  it('exports a supabase instance', async () => {
    const { supabase } = await import('../services/supabase')
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
