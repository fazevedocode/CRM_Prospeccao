import { cn } from './cn'

export function Card({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={cn(
        'bg-surface border border-border rounded p-4 shadow-[var(--card-shadow)] dark:shadow-none',
        onClick && 'cursor-pointer transition-colors hover:border-accent/50 active:scale-[.98] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
    >
      {children}
    </div>
  )
}
