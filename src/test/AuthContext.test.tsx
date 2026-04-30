import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, render, act } from '@testing-library/react'
import React from 'react'

const mockUnsubscribe = vi.fn()

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}))

import { useAuth, AuthProvider } from '../context/AuthContext'
import { supabase } from '../services/supabase'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  } as never)
})

describe('useAuth outside provider', () => {
  it('returns default values (user null, perfil null, isLoading true)', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.perfil).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })
})

describe('AuthProvider', () => {
  it('renders children', async () => {
    const { getByText } = render(
      React.createElement(AuthProvider, null,
        React.createElement('span', null, 'hola')
      )
    )
    await act(async () => {})
    expect(getByText('hola')).toBeTruthy()
  })

  it('sets isLoading to false after getSession resolves with no session', async () => {
    let captured: ReturnType<typeof useAuth> | undefined
    function Inner() {
      captured = useAuth()
      return null
    }
    render(
      React.createElement(AuthProvider, null, React.createElement(Inner, null))
    )
    await act(async () => {})
    expect(captured?.isLoading).toBe(false)
    expect(captured?.user).toBeNull()
  })

  it('calls unsubscribe on unmount', async () => {
    const { unmount } = render(
      React.createElement(AuthProvider, null, React.createElement('span', null))
    )
    await act(async () => {})
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
