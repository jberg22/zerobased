/// <reference types="vite/client" />

// #EDIT (07082026): Stage 1 — typed env keys (see .env.example) and the App
// Check debug-token global set by src/lib/firebase.ts in dev. No import/export
// statements in this file: it must stay a global script, not a module.
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_RECAPTCHA_SITE_KEY: string
  readonly VITE_USE_EMULATORS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined
// #END
