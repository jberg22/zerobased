// Stage 2d (07112026): Transaction detail — per-account read (Option A).
// Requires the accountId from the ?account= param (always set by list links).
// Without it we can't build the nested path, so we show a clear recovery hint
// rather than attempting a collection-group lookup.

import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { fetchTransactionById } from '../lib/data'
import type { TransactionDoc } from '../lib/contracts'
import { formatDate, humanizeCategory, signedMoney } from '../lib/format'
import { ErrorState, LoadingRows, PendingBadge } from '../components/States'

export default function TransactionDetail() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const accountId = searchParams.get('account')

  const [txn, setTxn] = useState<TransactionDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!user || !id || !accountId) return
    let alive = true
    fetchTransactionById(user.uid, id, accountId)
      .then((t) => {
        if (!alive) return
        if (!t) setNotFound(true)
        else setTxn(t)
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [user, id, accountId])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link
        to="/transactions"
        className="text-sm text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] transition-colors"
      >
        ← Transactions
      </Link>

      {!accountId ? (
        <div className="mt-8 rounded-lg border border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-ink-2)]">
          Open this transaction from the list to view its details.
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : notFound ? (
        <div className="mt-8 rounded-lg border border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-ink-2)]">
          That transaction isn’t here. It may have been removed.
        </div>
      ) : !txn ? (
        <LoadingRows label="Loading transaction…" />
      ) : (
        <div className="mt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-[var(--color-ink-0)] truncate">
                  {txn.description || 'Transaction'}
                </h1>
                {txn.isPending && <PendingBadge />}
              </div>
              <div className="mt-1 text-sm text-[var(--color-ink-3)]">
                {formatDate(txn.date)}
              </div>
            </div>
            <div
              className="tnum text-2xl whitespace-nowrap"
              style={{ color: txn.amount >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
            >
              {signedMoney(txn.amount)}
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Category" value={humanizeCategory(txn.pfcv2Primary || txn.category)} />
            <Field label="Detailed category" value={humanizeCategory(txn.categoryDetailed)} />
            <Field label="Type" value={txn.type} className="capitalize" />
            <Field label="Classification" value={txn.classification} className="capitalize" />
            <Field label="Authorized" value={formatDate(txn.authorizedDate)} />
            <Field label="Status" value={txn.isPending ? 'Pending' : 'Posted'} />
            <Field label="Recurring" value={txn.isRecurring ? 'Yes' : 'No'} />
            <Field label="Needs review" value={txn.needsReview ? 'Yes' : 'No'} />
          </dl>

          <p className="mt-8 text-xs text-[var(--color-ink-3)]">
            Editing categories, tags, and notes arrives in a later update.
          </p>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  className = '',
}: {
  label: string
  value: string | undefined | null
  className?: string
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-3)]">{label}</dt>
      <dd className={`mt-1 text-sm text-[var(--color-ink-1)] ${className}`}>{value || '—'}</dd>
    </div>
  )
}
