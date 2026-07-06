'use client'

import { useEffect, useState } from 'react'
import { getAiProspectSummary, generateApproachScript } from '@/app/ai-actions'
import { Button } from '@/components/ui/Button'

export default function AiCardPanel({ prospectId }: { prospectId: string }) {
  const [loading, setLoading]   = useState(true)
  const [resumo, setResumo]     = useState<string | null>(null)
  const [sugestao, setSugestao] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [canal, setCanal]       = useState<'dm' | 'call'>('dm')
  const [script, setScript]     = useState<string | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError]     = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    let cancelled = false
    getAiProspectSummary(prospectId, false).then(res => {
      if (cancelled) return
      setResumo(res.resumo)
      setSugestao(res.sugestao)
      setGeneratedAt(res.generatedAt)
      setError(res.error ?? null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [prospectId])

  async function refresh() {
    setRefreshing(true)
    const res = await getAiProspectSummary(prospectId, true)
    setResumo(res.resumo)
    setSugestao(res.sugestao)
    setGeneratedAt(res.generatedAt)
    setError(res.error ?? null)
    setRefreshing(false)
  }

  async function generate() {
    setGenLoading(true)
    setGenError(null)
    setScript(null)
    const res = await generateApproachScript(prospectId, canal)
    if (res.error) setGenError(res.error)
    setScript(res.script)
    setGenLoading(false)
  }

  async function copyScript() {
    if (!script) return
    try { await navigator.clipboard.writeText(script) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border-t border-border pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-text-faint">✨ Resumo com IA</h4>
        {!loading && (
          <button
            onClick={refresh}
            disabled={refreshing}
            className="text-xs font-medium text-accent hover:opacity-80 disabled:opacity-50"
          >
            {refreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-text-faint">Gerando resumo…</p>
      ) : error && !resumo ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <div className="space-y-2">
          {resumo && <p className="text-sm text-text leading-relaxed">{resumo}</p>}
          {sugestao && (
            <p className="text-sm text-accent bg-accent-soft rounded px-3 py-2 leading-relaxed">
              💡 {sugestao}
            </p>
          )}
          {generatedAt && (
            <p className="text-[11px] text-text-faint">
              Gerado em {new Date(generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-text-faint">Gerar script de abordagem</h4>
          <div className="flex items-center gap-1.5">
            <select
              value={canal}
              onChange={e => setCanal(e.target.value as 'dm' | 'call')}
              className="rounded px-2 py-1 text-xs bg-surface border border-border"
            >
              <option value="dm">DM / WhatsApp</option>
              <option value="call">Ligação</option>
            </select>
            <Button onClick={generate} disabled={genLoading}>
              {genLoading ? 'Gerando…' : 'Gerar'}
            </Button>
          </div>
        </div>

        {genError && <p className="text-sm text-danger">{genError}</p>}

        {script && (
          <div className="bg-surface-2 rounded p-3 space-y-2">
            <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{script}</p>
            <Button variant="ghost" onClick={copyScript}>
              {copied ? '✓ Copiado' : '📋 Copiar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
