// Stage 2 (07112026): Authenticated app shell — persistent left nav + header.
// Wraps the accounts/transactions pages. Kept deliberately quiet so the data
// is the focus.

import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { signOut, useAuth } from '../lib/auth'

const navItems = [
  { to: '/', label: 'Accounts', end: true },
  { to: '/transactions', label: 'Transactions', end: false },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex bg-[var(--color-surface-0)]">
      <aside className="w-56 shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface-1)] flex flex-col">
        <div className="px-5 py-5 border-b border-[var(--color-line)]">
          <span className="text-[var(--color-ink-0)] font-semibold tracking-tight">
            Zero<span className="text-[var(--color-accent)]">Based</span>
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--color-surface-3)] text-[var(--color-ink-0)]'
                    : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-2)]',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-[var(--color-line)] space-y-2">
          <div className="px-2 text-xs text-[var(--color-ink-3)] truncate" title={user?.email ?? ''}>
            {user?.email ?? 'Signed in'}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full text-left rounded-md px-3 py-2 text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  )
}
