'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  BLOCOS, TOTAL_ITENS, calcularNota, faixaDaNota, VEREDITO_TEXTO, type Faixa,
} from '@/lib/diagnostico-google'
import type { ProspectOption, DiagnosticoRow } from './types'

const IBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>

const FAIXA_TEXT: Record<Faixa, string> = { ok: 'text-ok', warn: 'text-warn', danger: 'text-danger' }
const FAIXA_BG: Record<Faixa, string> = { ok: 'bg-ok/10', warn: 'bg-warn/10', danger: 'bg-danger/10' }
const FAIXA_BADGE_TONE: Record<Faixa, 'ok' | 'warn' | 'danger'> = { ok: 'ok', warn: 'warn', danger: 'danger' }

function key(blocoIdx: number, itemIdx: number) {
  return `${blocoIdx}-${itemIdx}`
}

function formatDataPtBr(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
}

type Mode = 'editar' | 'relatorio'
type Tab = 'diagnostico' | 'historico'

export default function DiagnosticoPanel({
  prospects,
  initialDiagnosticos,
}: {
  prospects: ProspectOption[]
  initialDiagnosticos: DiagnosticoRow[]
}) {
  const supabase = useRef(createClient()).current

  const [tab, setTab] = useState<Tab>('diagnostico')
  const [mode, setMode] = useState<Mode>('editar')

  const [nomeNegocio, setNomeNegocio] = useState('')
  const [categoria, setCategoria] = useState('')
  const [observacao, setObservacao] = useState('')
  const [assinatura, setAssinatura] = useState('')

  const [prospectId, setProspectId] = useState<string | null>(null)
  const [prospectQuery, setProspectQuery] = useState('')
  const [prospectOpen, setProspectOpen] = useState(false)
  const prospectBoxRef = useRef<HTMLDivElement>(null)

  const [checked, setChecked] = useState<Set<string>>(new Set())

  const [recordId, setRecordId] = useState<string | null>(null)
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [nomeError, setNomeError] = useState(false)

  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoRow[]>(initialDiagnosticos)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (prospectBoxRef.current && !prospectBoxRef.current.contains(e.target as Node)) setProspectOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredProspects = useMemo(() => {
    const q = prospectQuery.trim().toLowerCase()
    const list = q ? prospects.filter(p => p.empresa.toLowerCase().includes(q)) : prospects
    return list.slice(0, 8)
  }, [prospectQuery, prospects])

  function toggleItem(blocoIdx: number, itemIdx: number) {
    setChecked(prev => {
      const next = new Set(prev)
      const k = key(blocoIdx, itemIdx)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function selectProspect(p: ProspectOption) {
    setProspectId(p.id)
    setNomeNegocio(p.empresa)
    if (p.nicho) setCategoria(prev => prev || p.nicho || '')
    setProspectQuery(p.empresa)
    setProspectOpen(false)
  }

  function clearProspect() {
    setProspectId(null)
    setProspectQuery('')
  }

  function resetDiagnostico() {
    setNomeNegocio('')
    setCategoria('')
    setObservacao('')
    setAssinatura('')
    setProspectId(null)
    setProspectQuery('')
    setChecked(new Set())
    setRecordId(null)
    setSaveError(null)
    setNomeError(false)
    setMode('editar')
  }

  const notaAtual = calcularNota(checked.size, TOTAL_ITENS)
  const faixaAtual = faixaDaNota(notaAtual)

  const blocoStats = BLOCOS.map((bloco, blocoIdx) => {
    const marcados = bloco.items.reduce((acc, _item, itemIdx) => acc + (checked.has(key(blocoIdx, itemIdx)) ? 1 : 0), 0)
    const pct = calcularNota(marcados, bloco.items.length)
    return { marcados, total: bloco.items.length, pct, faixa: faixaDaNota(pct) }
  })

  const problemas = BLOCOS.flatMap((bloco, blocoIdx) =>
    bloco.items
      .map((item, itemIdx) => ({ item, blocoIdx, itemIdx }))
      .filter(({ blocoIdx: bi, itemIdx: ii }) => !checked.has(key(bi, ii)))
  )

  async function salvarRegistro(nota: number) {
    setSaving(true)
    setSaveError(null)
    const payload = {
      prospect_id: prospectId,
      nome_negocio: nomeNegocio.trim(),
      categoria: categoria.trim() || null,
      observacao: observacao.trim() || null,
      assinatura: assinatura.trim() || null,
      nota,
    }
    const prospectVinculado = prospectId ? prospects.find(p => p.id === prospectId) ?? null : null
    try {
      if (recordId) {
        const { error } = await supabase.from('diagnosticos_google').update(payload).eq('id', recordId)
        if (error) throw error
        setDiagnosticos(prev => prev.map(d => d.id === recordId
          ? { ...d, ...payload, prospects: prospectVinculado ? { empresa: prospectVinculado.empresa } : null }
          : d))
      } else {
        const { data, error } = await supabase.from('diagnosticos_google').insert(payload).select().single()
        if (error) throw error
        const novo: DiagnosticoRow = {
          ...(data as Omit<DiagnosticoRow, 'prospects'>),
          prospects: prospectVinculado ? { empresa: prospectVinculado.empresa } : null,
        }
        setRecordId(novo.id)
        setReportDate(novo.created_at)
        setDiagnosticos(prev => [novo, ...prev])
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Não foi possível salvar o diagnóstico.')
    } finally {
      setSaving(false)
    }
  }

  async function gerarRelatorio() {
    if (!nomeNegocio.trim()) {
      setNomeError(true)
      return
    }
    setNomeError(false)
    if (!recordId) setReportDate(new Date().toISOString())
    setMode('relatorio')
    await salvarRegistro(notaAtual)
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* ── Barra de abas ─────────────────────────────────────────────────── */}
      <div className="print:hidden px-4 sm:px-6 pt-4 sm:pt-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="text-text-dim hover:text-text flex items-center gap-1 text-sm shrink-0">
            <IBack /> Início
          </Link>
          <h1 className="font-display font-bold text-lg text-text">Diagnóstico de Ficha do Google</h1>
        </div>

        <div className="flex items-center gap-1 border-b border-border mb-4">
          <button
            onClick={() => setTab('diagnostico')}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === 'diagnostico' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text'
            }`}
          >
            Diagnóstico
          </button>
          <button
            onClick={() => setTab('historico')}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === 'historico' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text'
            }`}
          >
            Histórico ({diagnosticos.length})
          </button>
        </div>
      </div>

      {tab === 'historico' ? (
        <HistoricoTab diagnosticos={diagnosticos} />
      ) : mode === 'editar' ? (
        <EditorTab
          nomeNegocio={nomeNegocio} setNomeNegocio={setNomeNegocio}
          nomeError={nomeError}
          categoria={categoria} setCategoria={setCategoria}
          observacao={observacao} setObservacao={setObservacao}
          assinatura={assinatura} setAssinatura={setAssinatura}
          prospectId={prospectId} prospectQuery={prospectQuery} setProspectQuery={setProspectQuery}
          prospectOpen={prospectOpen} setProspectOpen={setProspectOpen}
          prospectBoxRef={prospectBoxRef}
          filteredProspects={filteredProspects}
          selectProspect={selectProspect} clearProspect={clearProspect}
          checked={checked} toggleItem={toggleItem}
          blocoStats={blocoStats}
          notaAtual={notaAtual} faixaAtual={faixaAtual}
          onGerar={gerarRelatorio}
          saving={saving} saveError={saveError}
          onNovo={diagnosticos.length > 0 || recordId ? resetDiagnostico : undefined}
        />
      ) : (
        <RelatorioTab
          nomeNegocio={nomeNegocio} categoria={categoria} observacao={observacao} assinatura={assinatura}
          reportDate={reportDate}
          notaAtual={notaAtual} faixaAtual={faixaAtual}
          blocoStats={blocoStats}
          problemas={problemas}
          saving={saving} saveError={saveError}
          onVoltar={() => setMode('editar')}
        />
      )}
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Histórico
// ─────────────────────────────────────────────────────────────────────────────

function HistoricoTab({ diagnosticos }: { diagnosticos: DiagnosticoRow[] }) {
  return (
    <div className="px-4 sm:px-6 pb-6 max-w-3xl mx-auto w-full space-y-2">
      {diagnosticos.length === 0 ? (
        <p className="text-sm text-text-faint">Nenhum diagnóstico gerado ainda.</p>
      ) : (
        diagnosticos.map(d => {
          const faixa = faixaDaNota(d.nota)
          return (
            <div key={d.id} className="bg-surface border border-border rounded p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{d.nome_negocio}</p>
                <p className="text-xs text-text-faint">
                  {d.prospects?.empresa ? `Vinculado a ${d.prospects.empresa}` : 'Diagnóstico avulso'}
                  {' · '}{formatDataPtBr(d.created_at)}
                </p>
              </div>
              <Badge tone={FAIXA_BADGE_TONE[faixa]} className="shrink-0 text-sm px-2 py-1">{d.nota}/100</Badge>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Editor (checklist)
// ─────────────────────────────────────────────────────────────────────────────

type BlocoStat = { marcados: number; total: number; pct: number; faixa: Faixa }

function EditorTab({
  nomeNegocio, setNomeNegocio, nomeError,
  categoria, setCategoria,
  observacao, setObservacao,
  assinatura, setAssinatura,
  prospectId, prospectQuery, setProspectQuery, prospectOpen, setProspectOpen, prospectBoxRef,
  filteredProspects, selectProspect, clearProspect,
  checked, toggleItem,
  blocoStats,
  notaAtual, faixaAtual,
  onGerar, saving, saveError,
  onNovo,
}: {
  nomeNegocio: string; setNomeNegocio: (v: string) => void; nomeError: boolean
  categoria: string; setCategoria: (v: string) => void
  observacao: string; setObservacao: (v: string) => void
  assinatura: string; setAssinatura: (v: string) => void
  prospectId: string | null
  prospectQuery: string; setProspectQuery: (v: string) => void
  prospectOpen: boolean; setProspectOpen: (v: boolean) => void
  prospectBoxRef: React.RefObject<HTMLDivElement | null>
  filteredProspects: ProspectOption[]
  selectProspect: (p: ProspectOption) => void
  clearProspect: () => void
  checked: Set<string>
  toggleItem: (blocoIdx: number, itemIdx: number) => void
  blocoStats: BlocoStat[]
  notaAtual: number
  faixaAtual: Faixa
  onGerar: () => void
  saving: boolean
  saveError: string | null
  onNovo?: () => void
}) {
  return (
    <>
      <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full space-y-4 pb-32">
        {/* Campos do topo */}
        <div className="bg-surface border border-border rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-text-faint">Dados do diagnóstico</p>
            {onNovo && (
              <button onClick={onNovo} className="text-xs font-medium text-accent hover:opacity-80">
                + Novo diagnóstico
              </button>
            )}
          </div>

          <div ref={prospectBoxRef} className="relative">
            <label className="block text-xs font-medium text-text-dim mb-1">Vincular a um prospect (opcional)</label>
            <div className="flex items-center gap-2">
              <input
                value={prospectQuery}
                onChange={e => setProspectQuery(e.target.value)}
                onFocus={() => setProspectOpen(true)}
                placeholder="Buscar prospect por nome…"
                className="flex-1 border border-border rounded px-3 py-2 text-sm bg-surface"
              />
              {prospectId && (
                <button onClick={clearProspect} className="text-xs text-text-faint hover:text-text shrink-0">
                  desvincular
                </button>
              )}
            </div>
            {prospectOpen && filteredProspects.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded shadow-xl max-h-56 overflow-y-auto">
                {filteredProspects.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={e => { e.preventDefault(); selectProspect(p) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
                  >
                    <span className="text-text">{p.empresa}</span>
                    {p.nicho && <span className="text-text-faint text-xs ml-1.5">{p.nicho}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-dim mb-1">Nome do negócio *</label>
            <input
              value={nomeNegocio}
              onChange={e => setNomeNegocio(e.target.value)}
              placeholder="Nome que aparece na ficha do Google"
              className={`w-full border rounded px-3 py-2 text-sm bg-surface ${nomeError ? 'border-danger' : 'border-border'}`}
            />
            {nomeError && <p className="text-xs text-danger mt-1">Informe o nome do negócio para gerar o relatório.</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-dim mb-1">Ramo / categoria</label>
            <input
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              placeholder="Ex: Clínica odontológica"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-surface"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-dim mb-1">Observação para o relatório</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
              placeholder="Contexto adicional para o cliente (opcional)"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-surface resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-dim mb-1">Assinatura do rodapé</label>
            <input
              value={assinatura}
              onChange={e => setAssinatura(e.target.value)}
              placeholder="Ex: Equipe Radar · agencia@exemplo.com"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        {/* Blocos de checklist */}
        {BLOCOS.map((bloco, blocoIdx) => {
          const stat = blocoStats[blocoIdx]
          return (
            <div key={bloco.name} className="bg-surface border border-border rounded overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
                <p className="text-sm font-bold text-text">{bloco.name}</p>
                <span className="text-xs font-mono font-semibold text-text-dim">{stat.marcados}/{stat.total}</span>
              </div>
              <div className="divide-y divide-border">
                {bloco.items.map((item, itemIdx) => {
                  const isChecked = checked.has(key(blocoIdx, itemIdx))
                  return (
                    <button
                      key={item.t}
                      onClick={() => toggleItem(blocoIdx, itemIdx)}
                      className="w-full flex items-center gap-3 px-4 py-3 min-h-[60px] text-left hover:bg-surface-2 transition-colors"
                    >
                      <span
                        className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-accent border-accent' : 'border-border'
                        }`}
                      >
                        {isChecked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-text">{item.t}</span>
                        <span className="block text-xs text-text-faint">{item.h}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra inferior fixa */}
      <div
        className="print:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <p className={`text-2xl font-display font-black ${FAIXA_TEXT[faixaAtual]}`}>
              {notaAtual}<span className="text-sm text-text-faint font-sans font-normal">/100</span>
            </p>
            {saveError && <p className="text-xs text-danger">{saveError}</p>}
          </div>
          <Button onClick={onGerar} disabled={saving} className="px-6 py-2.5 text-sm">
            {saving ? 'Gerando…' : 'Gerar relatório'}
          </Button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Relatório
// ─────────────────────────────────────────────────────────────────────────────

function RelatorioTab({
  nomeNegocio, categoria, observacao, assinatura,
  reportDate,
  notaAtual, faixaAtual,
  blocoStats,
  problemas,
  saving, saveError,
  onVoltar,
}: {
  nomeNegocio: string
  categoria: string
  observacao: string
  assinatura: string
  reportDate: string
  notaAtual: number
  faixaAtual: Faixa
  blocoStats: BlocoStat[]
  problemas: { item: { t: string; h: string; p: string; f: string }; blocoIdx: number; itemIdx: number }[]
  saving: boolean
  saveError: string | null
  onVoltar: () => void
}) {
  return (
    <>
      <div className="px-4 sm:px-6 max-w-3xl mx-auto w-full space-y-6 pb-28 print:pb-0 print:pt-0 print:px-0 print:max-w-none">
        {/* Cabeçalho */}
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-accent print:text-black">
            Diagnóstico do Perfil da Empresa no Google
          </p>
          <h2 className="font-display font-black text-2xl text-text print:text-black">{nomeNegocio}</h2>
          <p className="text-sm text-text-dim print:text-black">
            {categoria ? `${categoria} · ` : ''}{formatDataPtBr(reportDate)}
          </p>
        </div>

        {/* Veredito */}
        <div className={`rounded border border-border p-5 ${FAIXA_BG[faixaAtual]} print:border-black`}>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`font-display font-black text-5xl ${FAIXA_TEXT[faixaAtual]} print:text-black`}>{notaAtual}</span>
            <span className="text-sm text-text-faint print:text-black">/100</span>
            <span className={`text-base font-semibold ${FAIXA_TEXT[faixaAtual]} print:text-black`}>{VEREDITO_TEXTO[faixaAtual]}</span>
          </div>
          {observacao && (
            <p className="text-sm text-text-dim mt-3 whitespace-pre-wrap print:text-black">{observacao}</p>
          )}
        </div>

        {/* Barras por bloco */}
        <div className="space-y-3">
          {BLOCOS.map((bloco, idx) => (
            <ProgressBar
              key={bloco.name}
              label={bloco.name}
              value={blocoStats[idx].marcados}
              max={blocoStats[idx].total}
              tone={blocoStats[idx].faixa}
            />
          ))}
        </div>

        {/* Correções */}
        <div className="space-y-3">
          <h3 className="font-display font-bold text-base text-text print:text-black">O que corrigir, em ordem de impacto</h3>
          {problemas.length === 0 ? (
            <div className="bg-ok/10 border border-ok/30 rounded p-4 print:border-black">
              <p className="text-sm font-semibold text-ok print:text-black">Nenhuma falha encontrada.</p>
              <p className="text-sm text-text-dim mt-1 print:text-black">
                A ficha está com todos os itens auditados em ordem. Recomenda-se manutenção periódica para manter o padrão.
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {problemas.map(({ item }, i) => (
                <li key={item.t} className="break-inside-avoid bg-surface border border-border rounded p-4 print:border-black">
                  <p className="text-sm font-semibold text-text print:text-black">{i + 1}. {item.t}</p>
                  <p className="text-sm text-text-dim mt-1 print:text-black">{item.p}</p>
                  <p className="text-sm font-medium text-accent mt-2 print:text-black print:font-bold">→ {item.f}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-border pt-4 space-y-1 print:border-black">
          <p className="text-xs text-text-faint print:text-black">
            {problemas.length} {problemas.length === 1 ? 'item a corrigir' : 'itens a corrigir'} nesta auditoria.
          </p>
          <p className="text-xs text-text-faint print:text-black">
            Auditoria realizada por observação direta da ficha pública no Google.
          </p>
          {assinatura && <p className="text-xs text-text-dim font-medium mt-2 print:text-black">{assinatura}</p>}
        </div>
      </div>

      {/* Barra inferior fixa */}
      <div
        className="print:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button onClick={onVoltar} className="text-sm font-medium text-text-dim hover:text-text flex items-center gap-1">
            <IBack /> Voltar e editar
          </button>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-text-faint">Salvando…</span>}
            {saveError && <span className="text-xs text-danger">{saveError}</span>}
            <Button onClick={() => window.print()} className="px-6 py-2.5 text-sm">Imprimir</Button>
          </div>
        </div>
      </div>
    </>
  )
}
