// Stage 2 (07112026): Accounts overview. One card per account, plus a summed
// total. Read-only. Balance sign is shown as-is (a negative balance, e.g. a
// credit card, is meaningful). Links through to the filtered transactions view.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { fetchAccounts } from '../lib/data'
import type { AccountDoc } from '../lib/contracts'
import { signedMoney } from '../lib/format'
import { ErrorState, EmptyState, LoadingRows, StatusBadge } from '../components/States'

export default function Accounts() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AccountDoc[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    fetchAccounts(user.uid)
      .then((a) => alive && setAccounts(a))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [user])

  const total = accounts?.reduce((sum, a) => sum + (a.balance ?? 0), 0) ?? 0

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-ink-0)] tracking-tight">
          Accounts
        </h1>
        {accounts && accounts.length > 0 && (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm text-[var(--color-ink-3)]">Total balance</span>
            <span className="tnum text-lg text-[var(--color-ink-0)]">{signedMoney(total)}</span>
          </div>
        )}
      </header>

      {error ? (
        <ErrorState message={error} />
      ) : accounts === null ? (
        <LoadingRows label="Loading accounts…" />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          hint="Link a bank in the ZeroBased app to see accounts here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate(`/transactions?account=${encodeURIComponent(a.id)}`)}
              className="text-left rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-1)] p-5 hover:border-[var(--color-accent-dim)] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[var(--color-ink-0)] font-medium truncate">{a.name}</div>
                  <div className="text-xs text-[var(--color-ink-3)] truncate">
                    {a.institutionName}
                    {a.mask ? ` ·· ${a.mask}` : ''}
                  </div>
                </div>
                {a.plaidStatus && <StatusBadge status={a.plaidStatus} />}
              </div>
              <div className="mt-4 tnum text-2xl text-[var(--color-ink-0)]">
                {signedMoney(a.balance ?? 0)}
              </div>
              <div className="mt-1 text-xs text-[var(--color-ink-3)] capitalize">{a.type}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
