// Stage 2 (07112026) / Stage 2b path correction (07112026): contracts.ts — the
// single source of truth for Firestore document shapes on the web side,
// mirrored from the real Lambda-written schema (verified against a live
// fixture pull AND the emulator document tree, not guessed).
//
// PATH CORRECTION (2b): transactions are NESTED under each account at
// users/{uid}/accounts/{accountId}/transactions/{txnId} — NOT a flat top-level
// collection. The "all accounts" view therefore uses a COLLECTION GROUP query
// on the `transactions` collection id (see data.ts).
//
// IMPORTANT ownership contracts (mirrored from iOS toDictionary()):
//   Lambda owns (web must NEVER write): lastUpdated, categoryDetailed,
//     itemErrorCode, and all plaid* identifiers.
//   Stage 2 is read-only, so nothing is written yet — but WRITABLE_* is defined
//   now so Stage 3 edits inherit the discipline.
//
// Sign convention (verified): amount negative = expense, positive = income.
//
// Tombstone model (verified): a soft-deleted doc is SHRUNKEN to just
// { isDeleted: true, deletedAt, purgeAt, lastUpdated }. Normal docs OMIT
// isDeleted. Excluded CLIENT-SIDE (a where('isDeleted','!=',true) would drop
// all normal docs, since != only matches docs where the field exists).

import { Timestamp } from 'firebase/firestore'

// ---- Collection ids & paths (all under users/{uid}) ----------------------

/** Collection id used for collection-group queries across all accounts. */
export const TRANSACTIONS_COLLECTION_ID = 'transactions'

export const paths = {
  accounts: (uid: string) => `users/${uid}/accounts`,
  // Transactions live nested under a specific account:
  accountTransactions: (uid: string, accountId: string) =>
    `users/${uid}/accounts/${accountId}/transactions`,
  transactionRules: (uid: string) => `users/${uid}/settings/transactionRules`,
} as const

// ---- Account ------------------------------------------------------------

export interface AccountDoc {
  id: string
  name: string
  institutionName: string
  mask: string
  balance: number
  openingBalance: number
  type: string
  status: string
  plaidStatus: string
  isPlaidLinked: boolean
  accountSourceType: string
  environment: string
  itemId: string
  plaidAccountId: string
  plaidItemId: string
  createdAt: Timestamp
  lastUpdated: Timestamp // Lambda-owned
  initialUpdateComplete: boolean
  historicalUpdateComplete: boolean
}

// ---- Transaction --------------------------------------------------------

export interface TransactionDoc {
  id: string
  accountId: string
  amount: number // negative = expense, positive = income
  description: string
  date: Timestamp
  authorizedDate: Timestamp
  category: string
  categoryDetailed: string // Lambda-owned
  pfcv2Primary: string
  categorySource: string
  categoryConfidence: string
  classification: string
  classificationSource: string
  descriptionSource: string
  type: string
  typeSource: string
  isPending: boolean
  isPlaidTransaction: boolean
  isRecurring: boolean
  isIgnored: boolean
  isCancelled: boolean
  isSystemGenerated: boolean
  needsReview: boolean
  reviewReason: string
  merchantEntityId?: string
  plaidAccountId: string
  plaidTransactionId: string
  pendingTransactionId: string | null
  lastUpdated: Timestamp // Lambda-owned
  // Tombstone fields — present ONLY on soft-deleted docs:
  isDeleted?: boolean
  deletedAt?: Timestamp
  purgeAt?: Timestamp
}

// ---- Tombstone helper ---------------------------------------------------

export function isTombstoned(doc: { isDeleted?: boolean }): boolean {
  return doc.isDeleted === true
}

// ---- Writable-field allowlist (Stage 3+; unused in read-only Stage 2) ----

export const WRITABLE_TRANSACTION_FIELDS = [
  'description',
  'category',
  'pfcv2Primary',
  'classification',
  'type',
  'isIgnored',
  'isRecurring',
] as const
