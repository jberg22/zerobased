// Stage 2 (07112026): display formatting. Centralized so money and dates read
// identically everywhere. Amount sign convention (verified): negative = expense.

import type { Timestamp } from 'firebase/firestore'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

/** Absolute-value currency string, e.g. 29.99 -> "$29.99". Sign is conveyed by
 *  color/placement in the UI, not a minus glyph, to keep columns clean. */
export function money(amount: number): string {
  return currency.format(Math.abs(amount))
}

/** Signed currency for account balances, where the sign is meaningful as-is. */
export function signedMoney(amount: number): string {
  return currency.format(amount)
}

const dayFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const dayShortFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

// Firestore Timestamps arrive with a toDate() method. Guard defensively in case
// a field is missing on an unusual document.
function toDate(ts: Timestamp | undefined | null): Date | null {
  if (ts && typeof (ts as Timestamp).toDate === 'function') return (ts as Timestamp).toDate()
  return null
}

export function formatDate(ts: Timestamp | undefined | null): string {
  const d = toDate(ts)
  return d ? dayFmt.format(d) : '—'
}

export function formatDateShort(ts: Timestamp | undefined | null): string {
  const d = toDate(ts)
  return d ? dayShortFmt.format(d) : '—'
}

/** Turn a PFC/category enum like GENERAL_MERCHANDISE_ELECTRONICS into
 *  "General merchandise electronics" for display. */
export function humanizeCategory(raw: string | undefined | null): string {
  if (!raw) return 'Uncategorized'
  const words = raw.replace(/_/g, ' ').toLowerCase().trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
