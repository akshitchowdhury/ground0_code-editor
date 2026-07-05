import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Github, Loader2, UserRound, ArrowRight, Lock, Mail, KeyRound, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchAuthProviders, apiForgotPassword, apiResetPassword } from '../lib/api.js'
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

function OAuthButton({ icon, label, enabled, onClick }) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      title={enabled ? `Continue with ${label}` : `${label} sign-in is not configured on this server yet (set its OAuth client id/secret in .env)`}
      className={`btn w-full justify-start gap-3 border px-4 py-2.5 ${
        enabled
          ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800'
          : 'cursor-not-allowed border-zinc-800 bg-zinc-900/60 text-zinc-500 opacity-60'
      }`}
    >
      <span className={enabled ? '' : 'grayscale'}>{icon}</span>
      <span className="text-sm font-medium">Continue with {label}</span>
      {!enabled && (
        <span className="ml-auto rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-500">Not set up</span>
      )}
    </button>
  )
}

const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500'

export default function Login() {
  const { user, signIn, signInWithPassword, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(null) // 'guest' | 'form' | 'reset' | null
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [providers, setProviders] = useState({ available: false, google: false, github: false })

  // mode: 'signin' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [resetToken, setResetToken] = useState(null)

  useEffect(() => {
    fetchAuthProviders().then(setProviders)
    // The Go backend redirects here with ?resetToken= (password-reset email
    // link) or ?authError= (failed/cancelled OAuth) — pick both up once.
    const params = new URLSearchParams(window.location.search)
    const token = params.get('resetToken')
    const authError = params.get('authError')
    if (token) {
      setResetToken(token)
      setMode('reset')
    }
    if (authError) setError(authError)
    if (token || authError) window.history.replaceState({}, '', window.location.pathname)
  }, [])

  // Once signed in (email/password, guest, or an OAuth round-trip that landed
  // us here already authenticated), leave the login page for wherever the user
  // was originally headed — defaulting to home.
  useEffect(() => {
    if (user) navigate(location.state?.from?.pathname || '/', { replace: true })
  }, [user, navigate, location.state])

  async function continueAsGuest() {
    setBusy('guest')
    setError(null)
    try {
      await signIn('guest')
    } catch (err) {
      setError(err?.message || 'Could not start a guest session.')
      setBusy(null)
    }
  }

  async function submitForm(e) {
    e.preventDefault()
    setBusy('form')
    setError(null)
    setNotice(null)
    try {
      if (mode === 'register') await register(email, password, name)
      else if (mode === 'signin') await signInWithPassword(email, password)
      else if (mode === 'forgot') {
        await apiForgotPassword(email)
        setNotice('If that account exists, a reset link is on its way. (No email service configured? The link is in the Go server console.)')
        setMode('signin')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function submitReset(e) {
    e.preventDefault()
    setBusy('reset')
    setError(null)
    try {
      await apiResetPassword(resetToken, password)
      setNotice('Password updated — sign in with it below.')
      setPassword('')
      setResetToken(null)
      setMode('signin')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const formTitle = { signin: 'Sign in', register: 'Create account', forgot: 'Send reset link', reset: 'Set new password' }[mode]

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950 lg:flex-row">
      {/* Left — 3D network animation */}
      <div className="relative h-56 shrink-0 overflow-hidden border-b border-zinc-800/80 sm:h-72 lg:h-auto lg:flex-1 lg:border-b-0 lg:border-r">
        <NetworkScene />
      </div>

      {/* Right — login card */}
      <div className="flex w-full flex-1 items-center justify-center overflow-y-auto p-6 lg:w-[460px] lg:flex-none lg:p-10">
        <div className="fade-up w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">
              Welcome to Ground&nbsp;Zer<span className="zero-neon">0</span>
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              Sign in to sync progress across devices, or jump straight in as a guest — guest data stays on this
              device.
            </p>
          </div>

          {notice && (
            <p className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-200">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> {notice}
            </p>
          )}
          {error && (
            <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-200">{error}</p>
          )}

          {mode === 'reset' ? (
            /* Password reset (arrived via emailed link) */
            <form onSubmit={submitReset} className="space-y-2.5">
              <div className="relative">
                <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 8 characters)" className={`${inputClass} pl-9`} autoFocus
                />
              </div>
              <button type="submit" disabled={busy !== null} className="btn-primary w-full justify-center gap-2 py-2.5 text-sm">
                {busy === 'reset' ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
                <span className="font-semibold">Set new password</span>
              </button>
              <button type="button" onClick={() => { setMode('signin'); setResetToken(null); setError(null) }} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300">
                Back to sign in
              </button>
            </form>
          ) : (
            <>
              {/* Email / password */}
              {providers.available ? (
                <form onSubmit={submitForm} className="space-y-2.5">
                  {mode === 'register' && (
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className={inputClass} />
                  )}
                  <div className="relative">
                    <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" className={`${inputClass} pl-9`}
                    />
                  </div>
                  {mode !== 'forgot' && (
                    <div className="relative">
                      <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password" required minLength={mode === 'register' ? 8 : 1} value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'register' ? 'Password (min 8 characters)' : 'Password'}
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  )}
                  <button type="submit" disabled={busy !== null} className="btn-primary w-full justify-center gap-2 py-2.5 text-sm">
                    {busy === 'form' ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
                    <span className="font-semibold">{formTitle}</span>
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    {mode === 'signin' ? (
                      <>
                        <button type="button" onClick={() => { setMode('register'); setError(null) }} className="text-zinc-400 hover:text-zinc-200">
                          New here? <span className="text-indigo-400">Create an account</span>
                        </button>
                        <button type="button" onClick={() => { setMode('forgot'); setError(null) }} className="text-zinc-500 hover:text-zinc-300">
                          Forgot password?
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => { setMode('signin'); setError(null) }} className="text-zinc-400 hover:text-zinc-200">
                        ← Back to sign in
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
                  Accounts are unavailable — the backend has no database connection. You can still continue as a
                  guest below.
                </p>
              )}

              {/* Divider */}
              <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                <span className="h-px flex-1 bg-zinc-800" />
                or continue with
                <span className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* OAuth — buttons light up when the server has client ids configured */}
              <div className="space-y-2.5">
                <OAuthButton icon={<GoogleIcon />} label="Google" enabled={providers.google} onClick={() => signIn('google')} />
                <OAuthButton icon={<Github size={16} className="text-zinc-300" />} label="GitHub" enabled={providers.github} onClick={() => signIn('github')} />
              </div>

              {/* Guest */}
              <button
                onClick={continueAsGuest}
                disabled={busy !== null}
                className="btn group mt-5 w-full justify-center gap-2 border border-zinc-700 bg-zinc-900 py-2.5 text-sm text-zinc-200 hover:border-zinc-500"
              >
                {busy === 'guest' ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />}
                <span className="font-semibold">{busy === 'guest' ? 'Entering…' : 'Continue as guest'}</span>
                {busy !== 'guest' && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
