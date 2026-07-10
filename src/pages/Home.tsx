// Stage 1 (07082026): Signed-in landing page. The "connection check" card IS
// the Stage 1 verification gate: it proves auth session → security rules →
// Firestore read, end to end, in whichever mode (emulator or real backend)
// the app is running. Uses getCountFromServer — a single aggregate read, not
// a full collection fetch — consistent with the windowed-read philosophy from
// the iOS Stage A–C work. Replaced by the real accounts UI in Stage 2.

import { useEffect, useState } from 'react'
import { collection, getCountFromServer } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { signOut, useAuth } from '../lib/auth'

export default function Home() {
  const { user } = useAuth()
  const [accountCount, setAccountCount] = useState<number | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getCountFromServer(collection(db, 'users', user.uid, 'accounts'))
      .then((snap) => setAccountCount(snap.data().count))
      .catch((err) => setCheckError(err instanceof Error ? err.message : String(err)))
  }, [user])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-semibold">
          Zero<span className="text-blue-500">Based</span>
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-2">
            <h1 className="text-xl font-semibold">Signed in</h1>
            <p className="text-sm text-gray-400">{user?.email ?? '(no email on account)'}</p>
            <p className="text-xs text-gray-600 font-mono break-all">{user?.uid}</p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-2">
            <h2 className="text-sm font-medium text-gray-400">
              Firestore connection check
            </h2>
            {checkError ? (
              <p className="text-sm text-red-400">{checkError}</p>
            ) : accountCount === null ? (
              <p className="text-sm text-gray-500">Checking…</p>
            ) : (
              <p className="text-sm">
                {accountCount} account document{accountCount === 1 ? '' : 's'} visible
                under your UID.
              </p>
            )}
            <p className="text-xs text-gray-600">
              Accounts and transactions arrive in Stage 2.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
