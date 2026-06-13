import { useState } from 'react'
import { Github, Loader2, UserRound, ArrowRight, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import NetworkScene from '../components/NetworkScene.jsx'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  )
}

function DisabledProvider({ icon, label }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon — OAuth sign-in is not implemented yet"
      className="btn w-full cursor-not-allowed justify-start gap-3 border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-500 opacity-60"
    >
      <span className="grayscale">{icon}</span>
      <span className="text-sm font-medium">Continue with {label}</span>
      <span className="ml-auto rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-500">Soon</span>
    </button>
  )
}

export default function Login() {
  const { signIn } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function continueAsGuest() {
    setBusy(true)
    setError(null)
    try {
      await signIn('guest') // sets the user → App swaps from Login to the app
    } catch (err) {
      setError(err?.message || 'Could not start a guest session.')
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950 lg:flex-row">
      {/* Left — 3D network animation */}
      <div className="relative h-56 shrink-0 overflow-hidden border-b border-zinc-800/80 sm:h-72 lg:h-auto lg:flex-1 lg:border-b-0 lg:border-r">
        <NetworkScene />
      </div>

      {/* Right — login card */}
      <div className="flex w-full flex-1 items-center justify-center p-6 lg:w-[460px] lg:flex-none lg:p-10">
        <div className="fade-up w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white">
              Welcome to Ground&nbsp;Zer<span className="zero-neon">0</span>
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              Jump straight in as a guest — no account needed. Your code, progress and designs are saved locally on
              this device.
            </p>
          </div>

          {/* Guest sign-in */}
          <button
            onClick={continueAsGuest}
            disabled={busy}
            className="btn-primary group w-full justify-center gap-2 py-2.5 text-sm"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />}
            <span className="font-semibold">{busy ? 'Entering…' : 'Continue as guest'}</span>
            {!busy && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
          </button>

          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
            <span className="h-px flex-1 bg-zinc-800" />
            or continue with
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* OAuth (disabled until auth is implemented) */}
          <div className="space-y-2.5">
            <DisabledProvider icon={<GoogleIcon />} label="Google" />
            <DisabledProvider icon={<Github size={16} className="text-zinc-300" />} label="GitHub" />
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
            <Lock size={11} /> Google &amp; GitHub sign-in are coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
