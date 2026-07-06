import { cn } from './cn'

export type MeterTone = 'ok' | 'accent' | 'warn' | 'danger'

const TONE_BG: Record<MeterTone, string> = {
  ok:     'bg-ok',
  accent: 'bg-accent',
  warn:   'bg-warn',
  danger: 'bg-danger',
}

const TONE_TEXT: Record<MeterTone, string> = {
  ok:     'text-ok',
  accent: 'text-accent',
  warn:   'text-warn',
  danger: 'text-danger',
}

export function ProgressBar({
  label,
  value,
  max,
  tone = 'accent',
  doneLabel,
}: {
  label: string
  value: number
  max: number
  tone?: MeterTone
  doneLabel?: string
}) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-sm text-text-dim truncate">{label}</span>
        {doneLabel ? (
          <span className={cn('text-xs font-semibold shrink-0', TONE_TEXT[tone])}>{doneLabel}</span>
        ) : (
          <span className="text-sm font-mono font-medium text-text shrink-0">
            {value}
            <span className="text-xs text-text-faint">/{max > 0 ? max : '–'} ({pct}%)</span>
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-track dark:bg-surface-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', TONE_BG[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
