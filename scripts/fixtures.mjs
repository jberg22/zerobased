#!/usr/bin/env node
// Stage 1 (07082026): Fixture tooling — clone the dev@ account's real,
// Lambda-written documents out of zerobasedus and replay them into the local
// emulators, so offline development happens against documents shaped by the
// real sync Lambda (itemErrorCode / lastUpdated / categoryDetailed and all),
// not hand-invented ones.
//
//   PULL (reads production, writes JSON):
//     DEV_UID=<uid> DEV_EMAIL=dev@zerobased.us node scripts/fixtures.mjs pull
//     • Requires ./serviceAccount.json (gitignored) — Firebase console →
//       Project settings → Service accounts → Generate new private key.
//     • Read-only against prod. Refuses to run if emulator env vars are set.
//
//   SEED (writes emulators only):
//     node scripts/fixtures.mjs seed        (emulators must be running)
//     • Sets FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST itself,
//       BEFORE loading firebase-admin, so it is structurally incapable of
//       writing to production. No service account involved.
//     • Also creates the dev auth user in the Auth emulator with the SAME UID
//       as prod (so users/{uid} paths line up) and password DEV_PASSWORD
//       (default: devpassword1).
//
// Fixture file: ./fixtures/dev-user.json — a recursive doc/collection tree
// with Firestore Timestamps encoded as {__ts, seconds, nanoseconds}.
// Plaid SANDBOX data only; if the dev account ever holds real financial data,
// add fixtures/ to .gitignore before pulling.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const MODE = process.argv[2]
const FIXTURE_DIR = './fixtures'
const FIXTURE_PATH = `${FIXTURE_DIR}/dev-user.json`
const SERVICE_ACCOUNT_PATH = './serviceAccount.json'

const EMULATOR_FIRESTORE = '127.0.0.1:8080'
const EMULATOR_AUTH = '127.0.0.1:9099'

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Timestamp-safe (de)serialization
// ---------------------------------------------------------------------------

function encode(value, Timestamp) {
  if (value instanceof Timestamp) {
    return { __ts: true, seconds: value.seconds, nanoseconds: value.nanoseconds }
  }
  if (Array.isArray(value)) return value.map((v) => encode(v, Timestamp))
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = encode(v, Timestamp)
    return out
  }
  return value
}

function decode(value, Timestamp) {
  if (value !== null && typeof value === 'object') {
    if (value.__ts === true) return new Timestamp(value.seconds, value.nanoseconds)
    if (Array.isArray(value)) return value.map((v) => decode(v, Timestamp))
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = decode(v, Timestamp)
    return out
  }
  return value
}

// ---------------------------------------------------------------------------
// PULL — production read → JSON
// ---------------------------------------------------------------------------

async function pull() {
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    fail('pull must read PRODUCTION — unset FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST first.')
  }
  const uid = process.env.DEV_UID
  const email = process.env.DEV_EMAIL
  if (!uid || !email) fail('Set DEV_UID and DEV_EMAIL, e.g.\n  DEV_UID=abc123 DEV_EMAIL=dev@zerobased.us node scripts/fixtures.mjs pull')
  if (!existsSync(SERVICE_ACCOUNT_PATH)) fail(`${SERVICE_ACCOUNT_PATH} not found (gitignored — download from Firebase console).`)

  const { initializeApp, cert } = await import('firebase-admin/app')
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore')

  initializeApp({ credential: cert(JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))) })
  const db = getFirestore()

  let docCount = 0

  async function pullDoc(docRef) {
    const snap = await docRef.get()
    const node = { data: snap.exists ? encode(snap.data(), Timestamp) : null, collections: {} }
    if (snap.exists) docCount += 1
    for (const col of await docRef.listCollections()) {
      node.collections[col.id] = {}
      // listDocuments() (not .get()) so "missing" parent docs that only have
      // subcollections are still traversed.
      for (const child of await col.listDocuments()) {
        node.collections[col.id][child.id] = await pullDoc(child)
      }
    }
    return node
  }

  console.log(`Pulling users/${uid} from production (read-only)…`)
  const tree = await pullDoc(db.collection('users').doc(uid))

  mkdirSync(FIXTURE_DIR, { recursive: true })
  writeFileSync(
    FIXTURE_PATH,
    JSON.stringify({ uid, email, exportedAt: new Date().toISOString(), tree }, null, 2),
  )
  console.log(`✓ ${docCount} documents → ${FIXTURE_PATH}`)
}

// ---------------------------------------------------------------------------
// SEED — JSON → emulators only
// ---------------------------------------------------------------------------

async function seed() {
  // Set BEFORE importing firebase-admin: with these set, the Admin SDK talks
  // only to the emulators and uses no real credentials. This is the guard
  // that makes seed structurally unable to write to production.
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_FIRESTORE
  process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_AUTH

  if (!existsSync(FIXTURE_PATH)) fail(`${FIXTURE_PATH} not found — run pull first.`)
  const { uid, email, exportedAt, tree } = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'))

  const { initializeApp } = await import('firebase-admin/app')
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore')
  const { getAuth } = await import('firebase-admin/auth')

  initializeApp({ projectId: 'zerobasedus' })
  const db = getFirestore()

  // Auth emulator user with the same UID as prod so users/{uid} paths match.
  const password = process.env.DEV_PASSWORD ?? 'devpassword1'
  try {
    await getAuth().createUser({ uid, email, password, emailVerified: true })
    console.log(`✓ Auth emulator user ${email} (uid ${uid})`)
  } catch (err) {
    if (err?.code === 'auth/uid-already-exists' || err?.code === 'auth/email-already-exists') {
      console.log(`• Auth emulator user already exists — skipped`)
    } else {
      throw err
    }
  }

  let docCount = 0

  async function seedDoc(docRef, node) {
    if (node.data !== null) {
      await docRef.set(decode(node.data, Timestamp))
      docCount += 1
    }
    for (const [colId, docs] of Object.entries(node.collections)) {
      for (const [docId, child] of Object.entries(docs)) {
        await seedDoc(docRef.collection(colId).doc(docId), child)
      }
    }
  }

  console.log(`Seeding fixture from ${exportedAt} into Firestore emulator…`)
  await seedDoc(db.collection('users').doc(uid), tree)
  console.log(`✓ ${docCount} documents seeded. Sign in as ${email} / ${password}`)
}

// ---------------------------------------------------------------------------

if (MODE === 'pull') {
  pull().catch((err) => fail(err.stack ?? String(err)))
} else if (MODE === 'seed') {
  seed().catch((err) => fail(err.stack ?? String(err)))
} else {
  fail('Usage: node scripts/fixtures.mjs <pull|seed>')
}
