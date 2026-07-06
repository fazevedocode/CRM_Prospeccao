import { cn } from './cn'

export type BadgeTone = 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'

const TONE_CLASS: Record<BadgeTone, string> = {
  accent:  'bg-accent-soft text-accent',
  ok:      'bg-ok/15 text-ok',
  warn:    'bg-warn/15 text-warn',
  danger:  'bg-danger/15 text-danger',
  neutral: 'bg-surface-2 text-text-dim',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  mono = false,
}: {
  tone?: BadgeTone
  children: React.ReactNode
  className?: string
  mono?: boolean
}) {
  return (
    <span
      className={cn(
        'text-[11px] font-semibold px-1.5 py-0.5 rounded-sm whitespace-nowrap',
        mono && 'font-mono',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
