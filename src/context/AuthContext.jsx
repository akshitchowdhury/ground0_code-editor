import { createContext, useContext, useEffect, useState } from 'react'
import { load, save, remove } from '../lib/storage.js'

// Firebase activates only when VITE_FIREBASE_* env vars are present.
// Otherwise the app runs in "demo auth" mode: sign-in is simulated locally
// so the whole UI flow works without any backend setup.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain)

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!firebaseEnabled) {
      setUser(load('demoUser'))
      setReady(true)
      return
    }
    let unsubscribe = () => {}
    let cancelled = false
    // Lazy-load firebase so it never touches the bundle's critical path.
    Promise.all([import('firebase/app'), import('firebase/auth')]).then(
      ([{ initializeApp, getApps }, { getAuth, onAuthStateChanged }]) => {
        if (cancelled) return
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
        unsubscribe = onAuthStateChanged(getAuth(app), (u) => {
          setUser(
            u
              ? {
                  name: u.displayName || u.email,
                  email: u.email,
                  photo: u.photoURL,
                  provider: u.providerData[0]?.providerId || 'firebase',
                }
              : null,
          )
          setReady(true)
        })
      },
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  async function signIn(provider) {
    // Guest is always a local-only account, independent of Firebase.
    if (provider === 'guest') {
      const guestUser = { name: 'Guest', email: 'guest@ground0.dev', photo: null, provider: 'guest', guest: true, demo: true }
      save('demoUser', guestUser)
      setUser(guestUser)
      return
    }
    if (!firebaseEnabled) {
      const demoUser = {
        name: provider === 'github' ? 'Octocat (demo)' : 'Demo Learner',
        email: 'demo@ground0.dev',
        photo: null,
        provider: `${provider} (demo)`,
        demo: true,
      }
      save('demoUser', demoUser)
      setUser(demoUser)
      return
    }
    const [{ getApps }, auth] = await Promise.all([import('firebase/app'), import('firebase/auth')])
    const { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } = auth
    const p = provider === 'github' ? new GithubAuthProvider() : new GoogleAuthProvider()
    await signInWithPopup(getAuth(getApps()[0]), p)
  }

  async function signOut() {
    if (!firebaseEnabled) {
      remove('demoUser')
      setUser(null)
      return
    }
    const [{ getApps }, { getAuth, signOut: fbSignOut }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ])
    await fbSignOut(getAuth(getApps()[0]))
  }

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut, firebaseEnabled }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
