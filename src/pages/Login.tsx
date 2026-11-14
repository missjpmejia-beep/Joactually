import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Critter } from '../components/Critter'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'That email and password don’t match.' : error.message)
  }

  async function forgot() {
    if (!email.trim()) {
      setError('Type your email first, then tap “Forgot password”.')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setBusy(false)
    if (error) setError(error.message)
    else setMsg('If that email has an account, a reset link is on its way.')
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={signIn}>
        <div className="login-hero">
          <Critter type="mood" score={4} size={84} />
          <h1 className="logo">Jo, Actually.</h1>
        </div>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <button type="submit" className="btn primary wide" disabled={busy}>
          Log in
        </button>
        <button type="button" className="link-btn" onClick={forgot} disabled={busy}>
          Forgot password
        </button>
      </form>
    </div>
  )
}

/** Shown after following a password-reset email link. */
export function SetNewPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={save}>
        <div className="login-hero">
          <Critter type="mood" score={4} size={84} />
          <h1 className="logo">Jo, Actually.</h1>
        </div>
        <p>Choose a new password.</p>
        <label className="field">
          <span>New password</span>
          <input type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn primary wide" disabled={busy || pw.length < 8}>
          Save password
        </button>
      </form>
    </div>
  )
}
