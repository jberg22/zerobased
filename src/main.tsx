// Stage 0 (07082026): React entry point. basename="/app" keeps every route
// definition and <Link> path clean (e.g. "/login", not "/app/login") while
// the app lives under zerobased.us/app.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// #EDIT (07082026): Stage 1 — auth state provider wraps the app
import { AuthProvider } from './lib/auth'
// #END
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/app">
      {/* #EDIT (07082026): Stage 1 — AuthProvider wraps App */}
      <AuthProvider>
        <App />
      </AuthProvider>
      {/* #END */}
    </BrowserRouter>
  </StrictMode>,
)
