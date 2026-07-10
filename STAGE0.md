# ZeroBased Web — Stage 0 (Scaffold) — 07082026

Goal: convert the Netlify site from "publish repo root" to a Vite build that
serves the untouched marketing page at `/`, a React SPA shell at `/app`, and
preserves the two load-bearing behaviors: the apple-app-site-association file
(universal links) and the `/plaid-callback` Plaid OAuth redirect URI.

Stage 0 is inert with respect to everything that exists today: no Firebase,
no Lambda, no iOS changes. Firestore/auth arrive in Stage 1.

## What's in this bundle

- `netlify.toml` — REPLACES the existing file (review the before/after in chat
  first). Adds [build] block + /app/* SPA fallback; AASA headers/redirect
  preserved verbatim.
- `package.json`, `tsconfig.json`, `vite.config.ts` — new, repo root.
- `app/index.html` — SPA entry (served at /app/).
- `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts` — shell.
- `public/plaid-callback/index.html` — fallback page for the Plaid OAuth
  redirect URI so it never 404s. Does NOT handle oauth_state_id (LinkKit
  owns that in-app).

NOT in this bundle (deliberate):
- The marketing `index.html` — stays at repo root, zero edits. Vite picks it
  up as a build entry via vite.config.ts.
- `apple-app-site-association` — your existing file MOVES (see step 2).
- `.gitignore` — append-only edit shown in chat.

## Apply steps

1. On a new branch in jberg22/zerobased, unzip this bundle at the repo root.
   Only netlify.toml overwrites an existing file.
2. Move the AASA file into Vite's verbatim-copy dir so it lands in dist/:
       git mv apple-app-site-association public/apple-app-site-association
   If any OTHER static files at the repo root must keep their URLs (favicon,
   images, robots.txt), move them into public/ the same way.
3. Append the .gitignore block from chat (node_modules/, dist/).
4. `npm install` — resolves current versions, writes package-lock.json.
   Commit the lockfile (reproducible Netlify builds).
5. Local verification (checklist below), then push the branch and use the
   Netlify deploy preview as the gate before merging to production.

## Verification checklist

Local (`npm run dev`):
- [ ] `/` renders the marketing page, visually unchanged
- [ ] `/app/` renders the shell (header + "Stage 0" card)
- [ ] Click "Client-side route test" → probe page renders, URL /app/route-test
- [ ] Hard-refresh on /app/route-test → probe still renders (dev middleware)
- [ ] `npm run typecheck` clean; `npm run build` clean

Local (inspect `dist/` after build):
- [ ] dist/index.html (marketing), dist/app/index.html (shell) both present
- [ ] dist/apple-app-site-association present, content identical to original
- [ ] dist/plaid-callback/index.html present

Netlify deploy preview:
- [ ] curl -sI <preview>/apple-app-site-association → 200,
      Content-Type: application/json
- [ ] curl -sI <preview>/.well-known/apple-app-site-association → 200 (forced
      rewrite intact), same body
- [ ] `/` marketing page intact
- [ ] `/app/` shell loads; `/app/route-test` loaded DIRECTLY (fresh tab)
      renders the probe, not a Netlify 404 → SPA fallback proven
- [ ] `/app` with no trailing slash resolves (Netlify directory handling).
      If it 404s, add a non-forced redirect: from "/app" to "/app/index.html"
      status 200, placed above the /app/* rule.
- [ ] `/plaid-callback` → fallback page, 200

Production after merge:
- [ ] Re-run both AASA curls against https://zerobased.us
- [ ] Universal link sanity check: tap a zerobased.us/plaid-callback link from
      iOS Notes → the app opens (interception unchanged)
- [ ] Plaid reconnect flow on device unaffected

## Parallel prep for Stage 1 (Apple developer portal — has lead time)

Sign in with Apple on web needs an Apple Services ID:
1. Certificates, Identifiers & Profiles → Identifiers → new Services ID
   (e.g. us.zerobased.web), enable "Sign In with Apple", group under the
   jb.aurum App ID.
2. Configure domain: zerobased.us; return URL:
   https://zerobasedus.firebaseapp.com/__/auth/handler
3. In Firebase console → Authentication → Apple provider: add the Services ID.
Also Stage 1: register a Web App in the Firebase project, add zerobased.us to
Authentication → Authorized domains, and register the web app with App Check
(reCAPTCHA provider) — product-level App Check enforcement on Firestore will
403 the web client until this exists.
