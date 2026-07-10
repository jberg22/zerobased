// Stage 0 (07082026): Placeholder shell. Its only job is to prove the
// pipeline: Vite build, Tailwind, client-side routing, and the Netlify SPA
// fallback. Replaced with real auth + navigation in Stage 1.
import { Link, Route, Routes } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <span className="text-lg font-semibold">
          Zero<span className="text-blue-500">Based</span>
        </span>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<RouteProbe />} />
        </Routes>
      </main>
    </div>
  )
}

function Home() {
  return (
    <div className="max-w-md text-center space-y-3">
      <h1 className="text-2xl font-semibold">Web app shell — Stage 0</h1>
      <p className="text-gray-400">
        Build pipeline, Tailwind, and routing are live. Sign-in arrives in
        Stage 1.
      </p>
      <Link
        to="/route-test"
        className="inline-block text-blue-400 underline underline-offset-4"
      >
        Client-side route test →
      </Link>
    </div>
  )
}

// Catch-all doubles as the deep-link verification probe: loading a URL like
// /app/route-test directly (hard refresh) only reaches this component if the
// Netlify /app/* fallback served the SPA entry instead of a 404.
function RouteProbe() {
  return (
    <div className="max-w-md text-center space-y-3">
      <h1 className="text-2xl font-semibold">Shell loaded — no page here yet</h1>
      <p className="text-gray-400">
        If you typed this URL directly or hard-refreshed and still see this,
        the SPA fallback is working.
      </p>
      <Link to="/" className="inline-block text-blue-400 underline underline-offset-4">
        ← Back to shell home
      </Link>
    </div>
  )
}
