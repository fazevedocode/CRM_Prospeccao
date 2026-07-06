'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CANAL_INFO, type Canal } from '@/lib/prospects'
import type { ScriptRow } from '@/lib/scripts'

const IBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>

function canalIcon(canal: string) {
  return CANAL_INFO[canal as Canal]?.icon ?? '💬'
}
function canalLabel(canal: string) {
  return CANAL_INFO[canal as Canal]?.label ?? canal
}

export default function ScriptsPanel({ scripts }: { scripts: ScriptRow[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const groups = scripts.reduce<Record<string, ScriptRow[]>>((acc, s) => {
    (acc[s.categoria] ??= []).push(s)
    return acc
  }, {})

  async function copy(script: ScriptRow) {
    try { await navigator.clipboard.writeText(script.body) } catch { /* ignore */ }
    setCopiedId(script.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-text-dim hover:text-text flex items-center gap-1 text-sm shrink-0">
          <IBack /> Início
        </Link>
        <h1 className="font-display font-bold text-lg text-text">Scripts de abordagem</h1>
      </div>

      <p className="text-sm text-text-dim">
        Referência de tom para a equipe. Para copiar já preenchido com os dados do prospect
        ([EMPRESA], [DECISOR], [NICHO]), abra o card do prospect no funil e use a seção de IA.
      </p>

      {Object.keys(groups).length === 0 ? (
        <p className="text-sm text-text-faint">Nenhum script cadastrado ainda.</p>
      ) : (
        Object.entries(groups).map(([categoria, items]) => (
          <div key={categoria} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-text-faint">{categoria}</h2>
            <div className="space-y-2">
              {items.map(script => (
                <div key={script.id} className="bg-surface border border-border rounded p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text flex items-center gap-1.5">
                      <span title={canalLabel(script.canal)}>{canalIcon(script.canal)}</span>
                      {script.nome}
                    </p>
                    <button
                      onClick={() => copy(script)}
                      className="text-xs font-medium text-accent hover:opacity-80 shrink-0"
                    >
                      {copiedId === script.id ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                  </div>
                  <p className="text-sm text-text-dim whitespace-pre-wrap leading-relaxed">{script.body}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </main>
  )
}
