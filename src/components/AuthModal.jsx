import { useState } from 'react'
import { X, Github, Loader2, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export default function AuthModal({ onClose }) {
  const { signIn, firebaseEnabled } = useAuth()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  async function handleSignIn(provider) {
    setBusy(provider)
    setError(null)
    try {
      await signIn(provider)
      onClose()
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fade-up w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-lg font-bold text-white">
            Welcome to Ground&nbsp;Zer<span className="zero-neon">0</span>
          </h2>
          <button onClick={onClose} className="btn-ghost !p-1 -mt-1 -mr-1">
            <X size={16} />
          </button>
        </div>
        <p className="mb-5 text-sm text-zinc-400">Sign in to keep your code and tutorial progress.</p>

        <div className="space-y-2.5">
          <button
            onClick={() => handleSignIn('google')}
            disabled={busy !== null}
            className="btn w-full justify-center border border-zinc-700 bg-white text-zinc-900 hover:bg-zinc-100"
          >
            {busy === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>
          <button
            onClick={() => handleSignIn('github')}
            disabled={busy !== null}
            className="btn w-full justify-center border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
          >
            {busy === 'github' ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
            Continue with GitHub
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {!firebaseEnabled && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/90">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Running in <strong>demo mode</strong> — sign-in is simulated locally. Add Firebase keys to{' '}
              <code className="rounded bg-zinc-800 px-1 font-mono">.env</code> (see{' '}
              <code className="rounded bg-zinc-800 px-1 font-mono">.env.example</code>) to enable real Google/GitHub
              OAuth.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
