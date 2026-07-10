// #REMOVED (07082026): Stage 0 placeholder shell (Home stub + RouteProbe) —
// per its own header comment it existed only to prove the build/routing
// pipeline, and is fully replaced by the Stage 1 routing below. The
// deep-link/SPA-fallback behavior it probed is unchanged: any unmatched URL
// under /app now lands on /login (signed out) or Home (signed in), which is
// the same end-to-end proof.
// #EDIT (07082026): Stage 1 — real routes. /login is public; everything else
// is wrapped in RequireAuth.
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './lib/auth'
import Home from './pages/Home'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
// #END
