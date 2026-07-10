// Stage 0 (07082026): React entry point. basename="/app" keeps every route
// definition and <Link> path clean (e.g. "/login", not "/app/login") while
// the app lives under zerobased.us/app.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/app">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
