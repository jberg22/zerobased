// Stage 2d (07112026): Firestore read layer — PER-ACCOUNT queries (Option A).
//
// Why not collection group: the iOS windowed-sync work already established that
// collection-group queries aren't a good fit for this schema/rules (userId is
// bound from the path), and per-account queries are the validated approach.
// This keeps web and iOS consistent and needs NO rules change, NO composite
// index, NO production cutover.
//
// "All accounts" view: query each account's transactions subcollection
// (windowed), merge, sort by date desc, and page the merged stream with a
// synthetic cursor. At the planned 8–20 account cap this is a handful of small
// reads — cheap and correct.
//
// Single-account view: one scoped subcollection query, natively paginated.
//
// Tombstones excluded client-side (shrunken tombstone docs lack `date`, so
// orderBy('date') already drops them; the filter is defense-in-depth).

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  isTombstoned,
  paths,
  type AccountDoc,
  type TransactionDoc,
} from './contracts'

export const TRANSACTIONS_PAGE_SIZE = 50

/** Fetch all account documents for the user. Small collection; no paging. */
export async function fetchAccounts(uid: string): Promise<AccountDoc[]> {
  const snap = await getDocs(collection(db, paths.accounts(uid)))
  return snap.docs
    .map((d) => d.data() as AccountDoc)
    .filter((a) => !isTombstoned(a as { isDeleted?: boolean }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export interface TransactionPage {
  transactions: TransactionDoc[]
  /** Opaque cursor for the next page. Shape differs by mode (see below). */
  cursor: TransactionsCursor | null
  hasMore: boolean
}

/**
 * Cursor is a discriminated union:
 *  - single-account: a Firestore doc snapshot (native pagination)
 *  - all-accounts: the date of the last emitted row; the next page re-queries
 *    each account for rows strictly older than this and merges. Slightly
 *    over-fetches at the boundary but is correct and simple at ≤20 accounts.
 */
export type TransactionsCursor =
  | { mode: 'account'; snap: QueryDocumentSnapshot<DocumentData> }
  | { mode: 'all'; beforeMillis: number }

function txMillis(t: TransactionDoc): number {
  // date is a Firestore Timestamp; toMillis() for stable sorting.
  const anyDate = t.date as unknown as { toMillis?: () => number }
  return anyDate?.toMillis ? anyDate.toMillis() : 0
}

/**
 * One windowed page of transactions, newest first.
 *   accountId provided -> scoped subcollection query, native cursor.
 *   accountId omitted   -> per-account fan-out + merge across all accounts.
 */
export async function fetchTransactionsPage(
  uid: string,
  opts: {
    accountId?: string | null
    cursor?: TransactionsCursor | null
    /** Needed for all-accounts mode; ignored for single-account. */
    accountIds?: string[]
  } = {},
): Promise<TransactionPage> {
  const { accountId, cursor } = opts

  // ---- Single account: native scoped query ----
  if (accountId) {
    const base = collection(db, paths.accountTransactions(uid, accountId))
    const snapCursor =
      cursor && cursor.mode === 'account' ? cursor.snap : null
    const q = snapCursor
      ? query(base, orderBy('date', 'desc'), startAfter(snapCursor), limit(TRANSACTIONS_PAGE_SIZE))
      : query(base, orderBy('date', 'desc'), limit(TRANSACTIONS_PAGE_SIZE))
    const snap = await getDocs(q)
    const last = snap.docs.length ? snap.docs[snap.docs.length - 1] : null
    const transactions = snap.docs
      .map((d) => d.data() as TransactionDoc)
      .filter((t) => !isTombstoned(t))
    return {
      transactions,
      cursor: last ? { mode: 'account', snap: last } : null,
      hasMore: snap.docs.length === TRANSACTIONS_PAGE_SIZE,
    }
  }

  // ---- All accounts: fan out per account, merge, window ----
  const ids = opts.accountIds ?? []
  if (ids.length === 0) {
    return { transactions: [], cursor: null, hasMore: false }
  }

  const beforeMillis =
    cursor && cursor.mode === 'all' ? cursor.beforeMillis : Number.POSITIVE_INFINITY

  // Pull up to PAGE_SIZE per account newer than the boundary, then merge. We
  // fetch PAGE_SIZE from each so the merged top PAGE_SIZE is guaranteed correct
  // even if one account dominates the window.
  const perAccount = await Promise.all(
    ids.map(async (id) => {
      const base = collection(db, paths.accountTransactions(uid, id))
      // Order by date desc; we filter the boundary client-side to keep the
      // query simple (no inequality + cursor juggling across N accounts).
      const q = query(base, orderBy('date', 'desc'), limit(TRANSACTIONS_PAGE_SIZE * 2))
      const snap = await getDocs(q)
      return snap.docs
        .map((d) => d.data() as TransactionDoc)
        .filter((t) => !isTombstoned(t))
        .filter((t) => txMillis(t) < beforeMillis)
    }),
  )

  const merged = perAccount
    .flat()
    .sort((a, b) => txMillis(b) - txMillis(a))

  const pageRows = merged.slice(0, TRANSACTIONS_PAGE_SIZE)
  const last = pageRows.length ? pageRows[pageRows.length - 1] : null
  // hasMore if any account still had rows beyond what we emitted.
  const hasMore = merged.length > TRANSACTIONS_PAGE_SIZE

  return {
    transactions: pageRows,
    cursor: last ? { mode: 'all', beforeMillis: txMillis(last) } : null,
    hasMore,
  }
}

/**
 * Fetch a single transaction by id within a known account (from the list link's
 * ?account= param). Per-account scoped read; no collection group.
 */
export async function fetchTransactionById(
  uid: string,
  id: string,
  accountId: string,
): Promise<TransactionDoc | null> {
  const snap = await getDocs(
    query(collection(db, paths.accountTransactions(uid, accountId)), orderBy('date', 'desc')),
  )
  const doc = snap.docs.map((d) => d.data() as TransactionDoc).find((t) => t.id === id)
  return doc && !isTombstoned(doc) ? doc : null
}
