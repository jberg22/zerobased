// Stage 0 (07082026): Vite config for the ZeroBased web app.
//
// Two HTML entries:
//   - index.html      → the existing marketing page, served at "/" (untouched)
//   - app/index.html  → the React SPA shell, served at "/app/"
//
// The appSpaFallback plugin is DEV-ONLY plumbing: it mirrors the Netlify
// "/app/* → /app/index.html" redirect so deep links like /app/login work
// under `npm run dev`. It has no effect on the production build.

import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function appSpaFallback(): Plugin {
  return {
    name: 'zerobased-app-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        const path = url.split('?')[0]
        // Rewrite extension-less /app paths to the SPA entry. Requests with a
        // "." (JS/CSS assets, HMR payloads) pass through untouched.
        if ((path === '/app' || path.startsWith('/app/')) && !path.includes('.')) {
          req.url = '/app/index.html'
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), appSpaFallback()],
  build: {
    rollupOptions: {
      input: {
        marketing: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
      },
    },
  },
})
