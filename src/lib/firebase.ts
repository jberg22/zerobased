// Stage 1 (07082026): Firebase initialization. This module is the ONLY place
// that knows whether we're talking to the local emulators or the real
// zerobasedus backend — everything else imports `auth` and `db` from here.
//
// Modes (see .env.example):
//   VITE_USE_EMULATORS=true  → Auth/Firestore emulators, App Check skipped
//                              (emulators don't enforce it).
//   otherwise                → real backend. In dev, an App Check DEBUG TOKEN
//                              is used instead of reCAPTCHA: first run prints
//                              a token to the browser console — register it in
//                              Firebase console → App Check → Apps → ⋮ →
//                              Manage debug tokens. Production builds use the
//                              real reCAPTCHA Enterprise provider.

import { initializeApp } from 'firebase/app'
// #EDIT (07102026): Stage 1 — reCAPTCHA Enterprise provider (score-based site
// key, no secret key). Matches the Enterprise key registered in App Check.
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
// #END
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const useEmulators =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true'

// Must be set BEFORE initializeAppCheck. Gated on DEV so it can never ship:
// Vite statically replaces import.meta.env.DEV with false in production
// builds and the whole branch is tree-shaken out.
if (import.meta.env.DEV && !useEmulators) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
}

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

// App Check: mandatory against the real backend (product-level enforcement on
// the Firestore API 403s tokenless clients at the gateway, before rules run).
// Pointless against emulators, so skipped there.
if (!useEmulators) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
  if (siteKey) {
// #EDIT (07102026): Stage 1 — Enterprise provider (was ReCaptchaV3Provider)
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })
    // #END
  } else {
    console.warn(
      '[firebase] VITE_RECAPTCHA_SITE_KEY is empty — App Check not initialized. ' +
        'Firestore calls against the real backend will be rejected at the gateway.',
    )
  }
}

export const auth = getAuth(app)
export const db = getFirestore(app)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  console.info('[firebase] Connected to LOCAL EMULATORS (auth:9099, firestore:8080)')
}
