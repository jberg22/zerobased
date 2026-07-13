// Stage 2d (07112026): Transactions list — per-account query model (Option A).
// All-accounts mode fans out across the user's accounts and merges; single
// account mode is a native scoped query. Passes accountIds into the data layer
// for the fan-out. Amount styling encodes sign (expense neutral, income teal).

import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  fetchAccounts,
  fetchTransactionsPage,
  type TransactionsCursor,
} from '../lib/data'
import type { AccountDoc, TransactionDoc } from '../lib/contracts'
import { formatDateShort, humanizeCategory, money } from '../lib/format'
import { EmptyState, ErrorState, LoadingRows, PendingBadge } from '../components/States'

export default function Transactions() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const accountFilter = searchParams.get('account')

  const [accounts, setAccounts] = useState<AccountDoc[]>([])
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [rows, setRows] = useState<TransactionDoc[]>([])
  const [cursor, setCursor] = useState<TransactionsCursor | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load accounts first — needed both for the filter chips and for the
  // all-accounts fan-out (which needs the list of account ids).
  useEffect(() => {
    if (!user) return
    fetchAccounts(user.uid)
      .then(setAccounts)
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => setAccountsLoaded(true))
  }, [user])

  const accountIds = accounts.map((a) => a.id)

  // Load first page once accounts are known (or immediately for single account).
  useEffect(() => {
    if (!user) return
    // For all-accounts mode we need accountIds, so wait for accounts to load.
    if (!accountFilter && !accountsLoaded) return

    let alive = true
    setLoading(true)
    setError(null)
    setRows([])
    setCursor(null)
    fetchTransactionsPage(user.uid, { accountId: accountFilter, accountIds })
      .then((page) => {
        if (!alive) return
        setRows(page.transactions)
        setCursor(page.cursor)
        setHasMore(page.hasMore)
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accountFilter, accountsLoaded])

  const loadMore = useCallback(async () => {
    if (!user || !cursor) return
    setLoadingMore(true)
    try {
      const page = await fetchTransactionsPage(user.uid, {
        accountId: accountFilter,
        accountIds,
        cursor,
      })
      setRows((prev) => [...prev, ...page.transactions])
      setCursor(page.cursor)
      setHasMore(page.hasMore)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cursor, accountFilter, accountIds])

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Account'

  const setFilter = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('account', id)
    else next.delete('account')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-[var(--color-ink-0)] tracking-tight">
          Transactions
        </h1>
      </header>

      {accounts.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip active={!accountFilter} onClick={() => setFilter(null)}>
            All accounts
          </FilterChip>
          {accounts.map((a) => (
            <FilterChip
              key={a.id}
              active={accountFilter === a.id}
              onClick={() => setFilter(a.id)}
            >
              {a.name}
            </FilterChip>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingRows label="Loading transactions…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No transactions"
          hint={
            accountFilter
              ? 'This account has no transactions in the current window.'
              : 'Transactions from your linked banks will appear here.'
          }
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-line)] overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((t) => (
                <tr
                  key={`${t.accountId}/${t.id}`}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-surface-1)] transition-colors"
                >
                  <td className="py-3 pl-4 pr-2 w-16 align-top">
                    <span className="tnum text-xs text-[var(--color-ink-3)]">
                      {formatDateShort(t.date)}
                    </span>
                  </td>
                  <td className="py-3 px-2 align-top">
                    <Link
                      to={`/transactions/${encodeURIComponent(t.id)}?account=${encodeURIComponent(t.accountId)}`}
                      className="block group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-ink-0)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                          {t.description || 'Transaction'}
                        </span>
                        {t.isPending && <PendingBadge />}
                      </div>
                      <div className="text-xs text-[var(--color-ink-3)] truncate">
                        {humanizeCategory(t.pfcv2Primary || t.category)}
                        {!accountFilter && (
                          <span className="text-[var(--color-ink-3)]"> · {accountName(t.accountId)}</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 pl-2 text-right align-top whitespace-nowrap">
                    <span
                      className="tnum"
                      style={{
                        color: t.amount >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
                      }}
                    >
                      {t.amount >= 0 ? '+' : '−'}
                      {money(t.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-md border border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-ink-1)] hover:border-[var(--color-accent-dim)] disabled:opacity-50 transition-colors"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1 text-xs transition-colors',
        active
          ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)] font-medium'
          : 'border border-[var(--color-line)] text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
