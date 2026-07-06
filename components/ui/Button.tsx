import { cn } from './cn'

type Variant = 'primary' | 'ghost'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-text hover:opacity-90',
  ghost:   'text-text-dim hover:text-text hover:bg-surface-2',
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'text-xs font-medium px-3.5 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  )
}
