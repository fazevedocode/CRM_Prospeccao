export function Panel({
  title,
  count,
  onClose,
  children,
}: {
  title: string
  count: number
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-md bg-surface border border-border rounded-t sm:rounded shadow-2xl max-h-[85vh] flex flex-col">
        {/* Handle bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-surface-2" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-text text-base">{title}</h3>
            <span className="text-xs font-mono font-semibold bg-surface-2 text-text-dim rounded-full px-2 py-0.5">
              {count}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text w-8 h-8 flex items-center justify-center rounded hover:bg-surface-2 text-xl leading-none transition-colors"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {count === 0
            ? <p className="text-text-faint text-sm text-center py-6">Nenhum resultado.</p>
            : children
          }
        </div>
      </div>
    </div>
  )
}
