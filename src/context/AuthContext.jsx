import { createContext, useContext, useEffect, useState } from 'react'
import { load, save, remove } from '../lib/storage.js'
import { fetchMe, apiLogin, apiRegister, apiLogout } from '../lib/api.js'

// Auth is backed by the Go backend's custom auth service (session cookie,
// /api/auth/*) as of Phase 3 — Firebase is gone. Two kinds of user:
//   * real accounts (email/password or Google/GitHub OAuth): hydrated from
//     GET /api/auth/me via the HttpOnly session cookie
//   * guest: a purely local account in localStorage, no backend row — the
//     app works fully offline with it (progress/designs stay on-device)
const AuthContext = createContext(null)

// Map the backend's user shape onto what the UI components expect.
const toUiUser = (u) => ({
  id: u.id,
  name: u.name || u.email,
  email: u.email,
  photo: u.photoURL || null,
  provider: 'account',
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    // A real session (cookie) wins; otherwise fall back to a saved guest.
    fetchMe()
      .then((u) => {
        if (!cancelled) setUser(toUiUser(u))
      })
      .catch(() => {
        if (!cancelled) setUser(load('demoUser'))
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function signIn(provider) {
    // Guest stays a local-only account — no backend involvement at all.
    if (provider === 'guest') {
      const guestUser = { name: 'Guest', email: 'guest@ground0.dev', photo: null, provider: 'guest', guest: true, demo: true }
      save('demoUser', guestUser)
      setUser(guestUser)
      return
    }
    // OAuth needs a top-level navigation (consent screen redirect), not a
    // fetch — the Go backend sets the session cookie on the way back.
    window.location.href = `/api/auth/oauth/${provider}/start`
  }

  async function signInWithPassword(email, password) {
    const u = await apiLogin(email, password)
    remove('demoUser')
    setUser(toUiUser(u))
  }

  async function register(email, password, name) {
    const u = await apiRegister(email, password, name)
    remove('demoUser')
    setUser(toUiUser(u))
  }

  async function signOut() {
    if (!user?.guest) await apiLogout()
    remove('demoUser')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signInWithPassword, register, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
