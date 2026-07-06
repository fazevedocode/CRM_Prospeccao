import { cn } from './cn'
import { Card } from './Card'

export type StatTone = 'ok' | 'accent' | 'warn' | 'danger' | 'neutral'

const TONE_TEXT: Record<StatTone, string> = {
  ok:      'text-ok',
  accent:  'text-accent',
  warn:    'text-warn',
  danger:  'text-danger',
  neutral: 'text-text-faint',
}

export function KpiStat({
  icon,
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  icon: string
  label: string
  value: number | string
  sub?: string
  tone: StatTone
  onClick?: () => void
}) {
  return (
    <Card onClick={onClick} className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wide">{label}</p>
          <p className={cn('font-display font-bold text-3xl mt-1.5 leading-none', TONE_TEXT[tone])}>{value}</p>
          {sub && <p className="text-xs font-mono text-text-dim mt-1.5 leading-snug">{sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-xl">{icon}</span>
          {onClick && (
            <span className="text-[10px] text-text-faint font-medium whitespace-nowrap">ver lista →</span>
          )}
        </div>
      </div>
    </Card>
  )
}
