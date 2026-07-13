# ZeroBased Web — Session Handoff (as of 07112026)

Companion web app for Aurum (the iOS personal-finance app). Goal: let a user
log into their account on the web and view/edit transactions, budgets, rules,
etc. Repo `jberg22/zerobased`, deployed via Netlify to zerobased.us. Same
Firebase project (`zerobasedus`) and same Firestore backend as iOS.

## STATUS: Stages 0–2 COMPLETE and committed. Next up: Stage 3 (transaction edits).

Everything is local on the `web-stage0` branch. NOTHING has been pushed;
zerobased.us still serves the old placeholder. Production is untouched.

---

## STACK & LAYOUT

- React 19 + Vite 7 + TypeScript + Tailwind v4, static SPA.
- Marketing page stays at `/` (untouched, repo-root `index.html`).
- App is a multi-page Vite build; SPA served at `/app` (router basename=/app).
- Firebase JS SDK: Auth (email/password + Sign in with Apple) + Firestore.
- App Check via **reCAPTCHA Enterprise** (score-based site key, no secret key).
- Local dev is fully OFFLINE via the Firebase Emulator Suite (Auth + Firestore),
  toggled by one env var. Real backend is used only for occasional gate-checks.

Local path: `~/zerobased`. Node 22 (Homebrew, keg-linked). Java 26 (for
emulators). netlify-cli, firebase-tools, firebase-admin all dev deps.

---

## KEY FACTS / IDENTIFIERS

- Firebase project: `zerobasedus` (Blaze plan).
- Web app ID: `1:819376365870:web:931454a84944d56d84dabf`
- Dev account (REAL Firebase Auth): `dev@zerobased.us`, UID
  `ChROJgJ0tiW3UVpi637SwLyHv7U2`. Used for real-backend mode + Plaid sandbox.
- Dev account (EMULATOR, created by seed): `dev@zerobased.us` / `devpassword1`.
  SAME email, DIFFERENT store — emulator auth ≠ real auth. Daily dev uses this.
- App Check debug token is registered in the Firebase console (per-browser),
  reused for every real-backend (mode B) check. Never in the repo.
- Apple Services ID for Sign in with Apple: verify domain is
  `zerobasedus.firebaseapp.com` (NOT zerobased.us — Firebase hosts the assoc.
  file), return URL `https://zerobasedus.firebaseapp.com/__/auth/handler`.
  Apple sign-in works from localhost because the popup goes to firebaseapp.com.

---

## THE TWO RUN MODES (one env var)

`.env.local` (gitignored) controls everything:

**Emulator mode — daily driver:** `VITE_USE_EMULATORS=true`
```
# tab 1:
npm run emulators           # Auth:9099, Firestore:8080, UI:4000. Loads real firestore.rules.
# tab 2 (re-seed after every emulator restart — data is in-memory):
npm run fixtures:seed
npm run dev                  # localhost:5173 ; open /app
```
Sign in `dev@zerobased.us` / `devpassword1`. App Check skipped in this mode.

**Real-backend mode — occasional gate-checks:** `VITE_USE_EMULATORS=false`
Restart `npm run dev`. Sign in with the REAL dev@ account. App Check enforced
(debug token already registered). Use to verify something against production
before shipping. FLIP BACK TO true for daily work.

**Fixtures** (real Lambda-shaped data → emulator):
```
DEV_UID=ChROJgJ0tiW3UVpi637SwLyHv7U2 DEV_EMAIL=dev@zerobased.us npm run fixtures:pull
npm run fixtures:seed
```
Pull reads production (read-only, needs ./serviceAccount.json, gitignored) and
writes ./fixtures/dev-user.json (gitignored). Currently ~136 docs: 2 accounts
(Checking, Credit card via Plaid sandbox "First Platypus Bank") + 125
transactions + settings/metadata/etc. To refresh: link more Plaid SANDBOX items
to dev@ in the iOS app, re-pull, re-seed.

---

## VERIFIED SCHEMA (source of truth — build against this, do not guess)

Transactions are NESTED: `users/{uid}/accounts/{accountId}/transactions/{txnId}`
(NOT a flat top-level collection). Accounts: `users/{uid}/accounts/{accountId}`.

Account doc fields: id, name, institutionName, mask, balance, openingBalance,
type, status, plaidStatus, isPlaidLinked, accountSourceType, environment,
itemId, plaidAccountId, plaidItemId, createdAt, lastUpdated, initialUpdateComplete,
historicalUpdateComplete.

Transaction doc fields: id, accountId, amount, description, date, authorizedDate,
category, categoryDetailed, pfcv2Primary, categorySource, categoryConfidence,
classification, classificationSource, descriptionSource, type, typeSource,
isPending, isPlaidTransaction, isRecurring, isIgnored, isCancelled,
isSystemGenerated, needsReview, reviewReason, merchantEntityId, plaidAccountId,
plaidTransactionId, pendingTransactionId, lastUpdated, counterparties (array).

**Sign convention:** amount NEGATIVE = expense, POSITIVE = income.
**Tombstone:** a soft-deleted doc is SHRUNKEN to just { isDeleted:true,
deletedAt, purgeAt, lastUpdated } — real fields gone. Normal docs OMIT isDeleted.
Excluded CLIENT-SIDE (a where('isDeleted','!=',true) drops all normal docs).

---

## CRITICAL ARCHITECTURE DECISION: PER-ACCOUNT QUERIES, NOT COLLECTION GROUP

The all-accounts transactions view queries EACH account's subcollection and
merges client-side. We spent significant effort trying collection-group queries
(collectionGroup(db,'transactions')) and they DO NOT WORK for this schema. Root
cause, confirmed via the emulator's Requests tab:

  Collection-group queries need a FIELD to constrain on to satisfy rules
  ("security rules are not filters" — the query must prove its whole potential
  result set matches the rule). This schema isolates by PATH (docs live under
  users/{uid}/...), and transaction docs have NO userId field. A collection-
  group query can't express a path-prefix constraint, so the rules engine
  denies it ("No matching allow statements").

This matches what the iOS windowed-sync work already concluded. DO NOT reattempt
collection-group queries unless a `userId` field is denormalized onto every
transaction doc (a Lambda change + backfill — not currently planned).

Consequence: `firestore.rules` is byte-identical to production. No rules
cutover pending. No composite index needed.

---

## OWNERSHIP CONTRACTS (mirror from iOS — matters at Stage 3+)

`src/lib/contracts.ts` is the single source of truth for doc shapes + the
writable-field allowlist. The web must NEVER write these Lambda-owned fields:
lastUpdated, categoryDetailed, itemErrorCode, all plaid* identifiers.

WRITABLE_TRANSACTION_FIELDS (current allowlist): description, category,
pfcv2Primary, classification, type, isIgnored, isRecurring. Refine against the
actual iOS write helper when Stage 3 starts.

Reminder from iOS project memory: any new RuleEffect-style field is now a FIVE
touch-point change (Codable, Swift serializer, Swift decoder, rules.py, and the
web's contracts.ts). contracts.ts is the web mitigation.

---

## FILE MAP (all under ~/zerobased)

- `firestore.rules` — emulator copy = production. (Console is authoritative;
  re-copy on console changes. Longer term: adopt `firebase deploy --only
  firestore:rules` to make the file the single source of truth.)
- `firebase.json` / `.firebaserc` — emulator config (rules→firestore.rules).
- `.env.local` (gitignored) / `.env.example` — Firebase web config + the mode flag.
- `scripts/fixtures.mjs` — pull (prod→JSON, read-only, guarded) / seed (JSON→
  emulators only, structurally can't touch prod).
- `serviceAccount.json` (gitignored) — full-priv prod credential, for pulls.
- `src/lib/firebase.ts` — THE only module that knows emulator vs real backend;
  App Check init (ReCaptchaEnterpriseProvider) + debug-token in dev.
- `src/lib/auth.tsx` — AuthProvider / useAuth / RequireAuth / signOut.
- `src/lib/contracts.ts` — doc shapes, paths, tombstone helper, writable list.
- `src/lib/data.ts` — per-account windowed reads + client-side merge; tombstone
  exclusion; fetchAccounts / fetchTransactionsPage / fetchTransactionById.
- `src/lib/format.ts` — money (tabular), dates, category humanizing.
- `src/components/AppShell.tsx` — sidebar+header. `States.tsx` — loading/error/
  empty/badges.
- `src/pages/` — Login, Accounts, Transactions, TransactionDetail.
- `src/App.tsx` — routes: /login public; else RequireAuth+AppShell wrapping
  Accounts (/), Transactions (/transactions), detail (/transactions/:id).
- `STAGE2D.md` — the accurate Stage 2 handoff (earlier STAGE*.md were deleted).

---

## DESIGN LANGUAGE

"Precise financial instrument": slate palette, single teal accent, IBM Plex
Mono tabular figures so money aligns like a ledger. Expenses quiet/neutral,
income lifted in teal (no stoplight red/green). All tokens in `src/index.css`
(@theme block). Deliberately not the AI-default cream/serif look.

---

## WORKING CONVENTIONS (this project)

- Bundle-per-stage: Claude builds files, zips to /mnt/user-data/outputs, user
  unzips at repo root, runs `npm run typecheck` as the REAL compile gate (the
  build env is offline so Claude can't run tsc), then verifies, then commits.
- `#EDIT (MMDDYYYY)` / `#END` / `#REMOVED` markers on edits. 3-space indent is
  the iOS convention; TS files use standard 2-space.
- Staged, inert-before-behavioral, verify-first. Paper before code.
- Every commit: check `git status` for `.env.local` / `serviceAccount.json` /
  `fixtures/` before committing. `git show --stat HEAD | grep -iE
  'env\.local|serviceAccount|fixtures/'` should return nothing.
- Terminal gotcha: new tabs open in ~ ; always `cd ~/zerobased` first. Don't
  paste `# comments` after commands (shell tries to run them).
- Run commands ONE AT A TIME; a failure in a pasted block scrolls past.

---

## DEFERRED / NOT YET DONE

- Never pushed. Branch-deploy checks still owed WHEN pushing: real CDN behavior
  on the new netlify.toml (AASA Content-Type, SPA fallback), and universal-link
  interception on a device. netlify.toml AASA rules are byte-identical to the
  live ones, so low risk. `/plaid-callback` fallback page exists.
- Branch is still named `web-stage0` (cosmetic; `git branch -m web-app` to rename).
- Bundle size warning (Firebase SDK large) — pre-launch optimization, deferred.
- Fonts load from Google Fonts CDN — could self-host later.
- Account cap planned at 8–10 → ~20 per user (informs per-account query choice).

---

## STAGE 3 — TRANSACTION EDITS (next session)

Scope: edit category, tags, notes on a transaction. First time the web WRITES.
- Write ONLY allowlisted fields (contracts.ts); never Lambda-owned fields.
- Mirror the iOS write semantics field-for-field. **At session start, ask the
  user to paste the actual Swift write helpers** (toDictionary(),
  manualTransactionDocData(), and whatever writes category/tags/notes) so the
  web mirrors LIVE code, not memory.
- Noon-UTC date normalization convention (matches Lambda's
  shape_plaid_transaction_for_firestore) if any date is written.
- This is where onSnapshot LIVE SYNC starts to matter: an edit on web should
  appear on iOS and vice versa. Read-only Stage 2 used one-shot getDocs; Stage 3
  is where listeners earn their place (still windowed/per-account for cost).
- Tags: note the four→five touch-point pattern; any new RuleEffect field needs
  contracts.ts updated too.

Later stages (roadmap): Stage 4 rules (create/edit against
users/{uid}/settings/transactionRules, retroactive apply via the apply_rule
Lambda — this is where Lambda CORS for the web origin first matters), Stage 5
budgets (deferred by user until transactions + rules ship; needs a TS port of
the iOS resolvedLines(asOf:) timeline resolver, ideally pinned to test vectors).

---

## QUICK START FOR NEXT SESSION

1. `cd ~/zerobased`
2. Confirm `.env.local` has `VITE_USE_EMULATORS=true`.
3. `npm run emulators` (tab 1) → `npm run fixtures:seed` → `npm run dev` (tab 2).
4. Sign in `dev@zerobased.us` / `devpassword1` at localhost:5173/app.
5. Confirm accounts + transactions still render, then start Stage 3.
