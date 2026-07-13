// Stage 2 (07112026): Shared loading / error / empty states. Copy follows the
// design-skill guidance: errors explain and direct, empties invite action, and
// nothing apologizes or gets vague.

export function LoadingRows({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="px-6 py-16 text-center text-sm text-[var(--color-ink-3)]">{label}</div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-6 my-8 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-1)] p-5">
      <div className="text-sm font-medium text-[var(--color-danger)]">Couldn’t load this</div>
      <div className="mt-1 text-sm text-[var(--color-ink-2)]">{message}</div>
      <div className="mt-2 text-xs text-[var(--color-ink-3)]">
        If you’re in emulator mode, check that the emulators are running and the
        fixture is seeded.
      </div>
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mx-6 my-8 rounded-lg border border-dashed border-[var(--color-line)] p-8 text-center">
      <div className="text-sm font-medium text-[var(--color-ink-1)]">{title}</div>
      <div className="mt-1 text-sm text-[var(--color-ink-3)]">{hint}</div>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const good = s === 'active' || s === 'good' || s === 'connected'
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs',
        good
          ? 'bg-[var(--color-surface-3)] text-[var(--color-income)]'
          : 'bg-[var(--color-surface-3)] text-[var(--color-danger)]',
      ].join(' ')}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: good ? 'var(--color-income)' : 'var(--color-danger)' }}
      />
      {status}
    </span>
  )
}

export function PendingBadge() {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[var(--color-surface-3)] text-[var(--color-ink-2)]">
      Pending
    </span>
  )
}
