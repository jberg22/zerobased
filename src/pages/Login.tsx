// Stage 1 (07082026): Login. Email/password + Sign in with Apple, matching
// the two providers the iOS app offers.
//
// Apple uses signInWithPopup (not signInWithRedirect): the popup navigates to
// the zerobasedus.firebaseapp.com auth handler, which is why Apple sign-in
// works from localhost, and it avoids the third-party-storage problems the
// redirect flow has under Safari ITP. Against the AUTH EMULATOR, the popup
// shows a fake Apple account chooser — fine for flow testing; the real Apple
// flow is a real-backend verification item.
//
// Deliberate Stage 1 scope cut: no account CREATION on web. Accounts are
// created in the iOS app; the web signs in to an existing account.

import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import {
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../lib/auth'

function messageFor(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'Email or password is incorrect.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a few minutes, then try again.'
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'The Apple sign-in window closed before finishing.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection — or, in emulator mode, that `npm run emulators` is running.'
      default:
        return `Sign-in failed (${err.code}).`
    }
  }
  return 'Sign-in failed.'
}

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already signed in (e.g. hard refresh landing on /login) — go home.
  if (!loading && user) return <Navigate to={from} replace />

  async function signInWithEmail(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  async function signInWithApple() {
    setBusy(true)
    setError(null)
    try {
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      await signInWithPopup(auth, provider)
      navigate(from, { replace: true })
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <span className="text-lg font-semibold">
          Zero<span className="text-blue-500">Based</span>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="text-sm text-gray-400">
              Use the same account as the ZeroBased iPhone app.
            </p>
          </div>

          <form onSubmit={signInWithEmail} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm text-gray-400">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm text-gray-400">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-2 font-medium"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="h-px flex-1 bg-gray-800" />
            or
            <div className="h-px flex-1 bg-gray-800" />
          </div>

          {/* Plain styled button for Stage 1; swap in Apple's official button
              assets/branding during the real design pass. */}
          <button
            type="button"
            onClick={signInWithApple}
            disabled={busy}
            className="w-full rounded-lg bg-white text-gray-950 hover:bg-gray-200 disabled:opacity-50 px-3 py-2 font-medium"
          >
             Continue with Apple
          </button>
        </div>
      </main>
    </div>
  )
}
