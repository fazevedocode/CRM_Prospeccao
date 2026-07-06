export default function PageSkeleton({ bars = 6 }: { bars?: number }) {
  return (
    <div className="min-h-screen bg-bg animate-pulse">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-surface-2" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded-sm bg-surface-2" />
            <div className="h-2.5 w-16 rounded-sm bg-surface-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded bg-surface-2" />
          <div className="h-8 w-14 rounded bg-surface-2" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-5 w-32 rounded-sm bg-surface-2" />
        <div className="bg-surface rounded border border-border p-5 space-y-3">
          {Array.from({ length: bars }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded-sm bg-surface-2"
              style={{ width: `${75 + (i % 3) * 10}%` }}
            />
          ))}
        </div>
        <div className="bg-surface rounded border border-border p-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 rounded-sm bg-surface-2"
              style={{ width: `${60 + i * 15}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
