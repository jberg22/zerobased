// Stage 1 (07082026): Auth state plumbing. One onAuthStateChanged listener at
// the top of the tree; everything below reads from context. RequireAuth wraps
// protected routes and bounces signed-out visitors to /login, preserving the
// path they wanted so Login can send them back after sign-in.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { auth } from './firebase'

interface AuthState {
  user: User | null
  /** true until the first onAuthStateChanged callback resolves */
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(
    () => onAuthStateChanged(auth, (user) => setState({ user, loading: false })),
    [],
  )

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Blank frame while Firebase restores the session — avoids a login-screen
  // flash on every hard refresh for signed-in users.
  if (loading) return <div className="min-h-screen bg-gray-950" />

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth)
}
