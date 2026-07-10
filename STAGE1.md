# ZeroBased Web — Stage 1 (Auth + App Check + Offline stack) — 07082026

Prerequisite: Stage 0 applied and its local gates passing (`npm run dev`
serves marketing at / and shell at /app; `netlify dev` serves the AASA file
with Content-Type: application/json).

Stage 1 delivers: Firebase sign-in (email/password + Apple), App Check, the
emulator-based offline stack behind one flag (VITE_USE_EMULATORS), and
fixture tooling that clones real Lambda-written documents into the emulator.
Still nothing published — every gate below runs on localhost.

## What's in this bundle

New:
- `firebase.json`, `.firebaserc` — emulator config (auth:9099, firestore:8080,
  UI:4000) pointed at the real rules file.
- `firestore.rules` — byte-for-byte copy of the live production rules with a
  sync-discipline header. Console stays authoritative; re-copy on any change.
- `.env.example` — documents every VITE_* key. Copy to `.env.local` and fill.
- `src/lib/firebase.ts` — the ONLY module that knows emulator vs real backend.
- `src/lib/auth.tsx` — AuthProvider / useAuth / RequireAuth / signOut.
- `src/pages/Login.tsx` — email/password form + Sign in with Apple (popup).
- `src/pages/Home.tsx` — signed-in page whose Firestore "connection check"
  (a single getCountFromServer aggregate read) IS the stage gate.
- `scripts/fixtures.mjs` — pull (prod → JSON, read-only, guarded) and seed
  (JSON → emulators only, structurally unable to touch prod).

Replacing Stage 0 files (diffs shown in chat):
- `src/App.tsx` (placeholder shell retired per its own header), `src/main.tsx`,
  `src/vite-env.d.ts`, `package.json`.

Not in bundle: `.gitignore` append (in chat).

## One-time console setup (manual, ~30 min + Apple)

1. **Register the web app.** Firebase console → Project settings → General →
   Your apps → Add app → Web (name: "ZeroBased Web", no Firebase Hosting).
   Copy the config object's values into `.env.local`.
2. **Authorized domains.** Authentication → Settings → Authorized domains:
   `localhost` is present by default; add `zerobased.us` now (inert until
   something is published there).
3. **Email/password provider** — confirm enabled (iOS already uses it).
4. **Apple provider.** Apple developer portal: Services ID (e.g.
   `us.zerobased.web`) grouped under the `jb.aurum` App ID, Sign In with Apple
   enabled. In its Web Authentication Configuration — Domains:
   `zerobasedus.firebaseapp.com`; Return URL:
   `https://zerobasedus.firebaseapp.com/__/auth/handler`.
   (Correction to STAGE0.md: the domain Apple verifies is the FIREBASE AUTH
   domain, not zerobased.us — Firebase hosts the association file for you.
   This is also why Apple sign-in works from localhost: the popup navigates
   to firebaseapp.com.)
   Then: Keys → new "Sign in with Apple" private key → download .p8, note Key
   ID. Firebase console → Authentication → Apple provider: enable, enter
   Services ID, and under OAuth code flow: Team ID + Key ID + .p8 contents.
5. **App Check.** Google reCAPTCHA admin (v3) → create site key for domain
   `zerobased.us`. Firebase console → App Check → Apps → register "ZeroBased
   Web" with reCAPTCHA v3 + that site key. Put the site key in `.env.local`.
   Localhost never exercises reCAPTCHA — dev uses a DEBUG TOKEN (step below).
6. **Dev account.** Authentication → Users → Add user
   (`dev@zerobased.us` + a real password). Note its UID.
7. **Service account key** (fixture pulls only). Project settings → Service
   accounts → Generate new private key → save as `./serviceAccount.json`
   (gitignored — verify with `git status` before committing anything).

## Apply steps

1. Unzip at repo root on the working branch. Overwrites: `src/App.tsx`,
   `src/main.tsx`, `src/vite-env.d.ts`, `package.json` (review chat diffs).
2. Append the `.gitignore` block from chat.
3. `cp .env.example .env.local`, fill in values from console setup.
4. `npm install`, commit the updated lockfile.

## Run modes

**A — Fully offline (daily loop):**
```
npm run emulators          # terminal 1 — leave running (needs Java)
npm run fixtures:seed      # terminal 2, once per emulator start
npm run dev                # terminal 2
```
`.env.local`: `VITE_USE_EMULATORS=true`. Sign in: dev@zerobased.us /
devpassword1. Emulator UI at localhost:4000 to inspect docs. Emulator state
is in-memory — re-seed after each emulator restart (seconds for ~600 docs).

**B — Real backend, still localhost (stage-gate runs):**
`.env.local`: `VITE_USE_EMULATORS=false`, restart `npm run dev`. First run
prints an App Check debug token in the BROWSER console → register it:
App Check → Apps → ZeroBased Web → ⋮ → Manage debug tokens. Treat the token
like a credential (per-browser-profile, revocable).

**Fixtures** (once, then whenever dev data changes):
```
DEV_UID=<uid from step 6> DEV_EMAIL=dev@zerobased.us npm run fixtures:pull
```
Pull is read-only against prod and refuses to run with emulator env vars set;
seed sets emulator env vars itself before loading firebase-admin, so it
cannot write to prod. The dev account is empty until you either add data via
iOS signed in as dev@ or link a Plaid SANDBOX item so the real Lambda writes
real-shaped documents (recommended before Stage 2). Fixtures are committed —
sandbox data only; gitignore `fixtures/` if that ever changes.

## Verification checklist (Stage 1 gates)

Mode A — emulators:
- [ ] `npm run emulators` starts; log line shows it loaded `firestore.rules`
- [ ] `fixtures:seed` reports the auth user + N documents
- [ ] /app redirects to /app/login when signed out
- [ ] Wrong password → "Email or password is incorrect." (rules of the form)
- [ ] Sign in dev@ → Home; connection check shows the seeded account count
- [ ] Emulator UI (localhost:4000) → Firestore shows users/{uid} tree
- [ ] RULES gate: in the emulator UI, note a SECOND uid's path
      (users/otherUid/accounts) — the app must show 0 documents for it and
      never read it; optionally create a second auth user and confirm each
      sees only their own count
- [ ] Sign out → back to /app/login; hard refresh while signed in does NOT
      bounce to login (session restore)
- [ ] Apple button: emulator shows the fake account chooser; flow completes
- [ ] `npm run typecheck` and `npm run build` clean

Mode B — real backend from localhost:
- [ ] Debug token printed, registered; RELOAD then: connection check succeeds
      (this is the App Check gate — a failure here reads as a 403/permission
      error even with correct auth)
- [ ] Sign in as dev@ works; count reflects real backend state
- [ ] Apple sign-in end-to-end with a real Apple ID (popup → firebaseapp.com
      handler → back signed in)
- [ ] Firebase console → App Check → Firestore shows verified requests from
      the web app

Explicitly NOT provable in Stage 1 (unchanged from the offline-dev plan):
Lambda CORS (Stage 4), universal links / CDN behavior (branch deploy, later),
production reCAPTCHA verification (first deploy).

## Stage 2 preview

Read-only accounts + transactions: windowed queries, tombstone exclusion
(`deleted == true`), account detail. Before starting, link one Plaid sandbox
item to dev@ via the iOS app so fixtures contain real Lambda-written
transaction documents, then re-run fixtures:pull + seed.
