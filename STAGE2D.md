# ZeroBased Web — Stage 2d (switch to per-account queries, Option A) — 07112026

## Why the change

The Stage 2b/2c collection-group approach kept failing in the emulator
("No matching allow statements") despite a correctly-placed rule. Rather than
keep fighting emulator collection-group support, we switched to PER-ACCOUNT
queries (Option A) — which is exactly what the iOS windowed-sync work already
concluded is the right pattern for this schema (userId bound from the path).
This keeps web and iOS consistent and needs NO rules change, NO composite
index, and NO production cutover.

The per-account filter chips already proved this query model works in your
emulator; all-accounts now just does the same per-account query across every
account and merges client-side. At the planned 8–20 account cap, that's a
handful of small windowed reads.

## What's in this bundle

- `firestore.rules` — REPLACES your file. REVERTS the collection-group rule;
  now byte-identical to production again (drift eliminated).
- `src/lib/data.ts` — REPLACES: per-account query + client-side merge for
  all-accounts; native scoped query for single account; tombstone exclusion.
- `src/pages/Transactions.tsx` — REPLACES: passes accountIds for the fan-out,
  uses the new cursor type, waits for accounts before the all-accounts load.
- `src/pages/TransactionDetail.tsx` — REPLACES: reads by (accountId, id) via the
  ?account= param; clear hint if opened without it.

Unchanged: contracts.ts (an unused TRANSACTIONS_COLLECTION_ID export remains;
harmless), format.ts, App.tsx, index.css, AppShell, States, Accounts.

## Apply

1. `unzip -o ~/Downloads/zerobased-web-stage2d.zip -d ~/zerobased`
   (overwrites firestore.rules + the 3 src files above)
2. `npm run typecheck`  ← stop and paste errors if any
3. RESTART emulator (rules changed): Ctrl-C emulator tab, `npm run emulators`
4. Re-seed: `npm run fixtures:seed`
5. Reload the app.

## Verification gate

- [ ] typecheck + build clean
- [ ] "All accounts" LOADS — newest-first across both accounts, ~50 rows
- [ ] "Load more" pulls older rows; ordering stays correct across the boundary
- [ ] Per-account chips still work (unchanged)
- [ ] Per-account row counts sum to the all-accounts total (minus tombstones)
- [ ] No tombstoned rows; Apple −$29.99 present; income teal / expense neutral;
      pending badge shows
- [ ] Row → detail loads via ?account=; back link works
- [ ] Hard-refresh on /app/transactions still works

## Notes

- No production cutover needed. When you next deploy, production rules already
  match this file (we reverted the collection-group addition), so nothing
  special is required for transactions.
- All-accounts pagination over-fetches slightly at the page boundary (fetches
  2×PAGE_SIZE per account, filters by date client-side). Correct and cheap at
  ≤20 accounts; if account counts ever explode, revisit. They won't, per the cap.
