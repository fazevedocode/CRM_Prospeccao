'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ThemeToggle'
import ProspectModal from './ProspectModal'
import {
  STAGES, CANAL_INFO, TEMPERATURA_INFO, REACTIVATION_DAYS, daysSince,
  type Prospect, type Stage,
} from '@/lib/prospects'

type Team = { id: string; full_name: string }

function money(v: number | null) {
  if (!v) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function initials(name: string | null) {
  if (!name) return '–'
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '–'
}

const IPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
const IClock = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>

export default function FunilBoard({
  initialCards, userId, userName, isManager, team,
}: {
  initialCards: Prospect[]
  userId: string
  userName: string
  isManager: boolean
  team: Team[]
}) {
  const [supabase] = useState(() => createClient())
  const [cards, setCards]   = useState<Prospect[]>(initialCards)
  const [fResp, setFResp]   = useState('')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen]     = useState(false)
  const [editingCard, setEditingCard] = useState<Prospect | null>(null)
  const [presetStage, setPresetStage] = useState<Stage>('prospect')
  const [forceStage, setForceStage]   = useState<Stage | undefined>(undefined)

  const [dragOverCol, setDragOverCol] = useState<Stage | null>(null)
  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const dragIdRef = useRef<string | null>(null)

  // ── Realtime ──────────────────────────────────────────
  useEffect(() => {
    const matchAccess = (row: Prospect) => isManager || row.responsavel_id === userId
    const ch = supabase.channel('prospects-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prospects' }, ({ new: newRow }) => {
        const row = newRow as Prospect
        if (matchAccess(row)) setCards(prev => prev.some(c => c.id === row.id) ? prev : [...prev, row])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'prospects' }, ({ new: newRow }) => {
        const row = newRow as Prospect
        if (matchAccess(row)) {
          setCards(prev => prev.map(c => c.id === row.id ? row : c))
        } else {
          setCards(prev => prev.filter(c => c.id !== row.id))
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'prospects' }, ({ old: oldRow }) => {
        setCards(prev => prev.filter(c => c.id !== (oldRow as Prospect).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, isManager, userId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // ── Filtro ────────────────────────────────────────────
  const filtered = cards.filter(c => {
    if (fResp && c.responsavel_id !== fResp) return false
    if (search) {
      const blob = [c.empresa, c.nicho, c.decisor_nome].filter(Boolean).join(' ').toLowerCase()
      if (!blob.includes(search.toLowerCase())) return false
    }
    return true
  })

  // ── Stats ─────────────────────────────────────────────
  const wonCards  = filtered.filter(c => c.stage === 'ganho')
  const lostCards = filtered.filter(c => c.stage === 'perdido')
  const openCount = filtered.length - wonCards.length - lostCards.length
  const conv = (wonCards.length + lostCards.length) > 0
    ? Math.round(wonCards.length / (wonCards.length + lostCards.length) * 100) : 0
  const revenue = wonCards.reduce((s, c) => s + (c.valor_potencial || 0), 0)

  function teamName(id: string | null) {
    return team.find(t => t.id === id)?.full_name ?? null
  }

  // ── Modal ─────────────────────────────────────────────
  function openNew(stage: Stage = 'prospect') {
    setEditingCard(null)
    setPresetStage(stage)
    setForceStage(undefined)
    setModalOpen(true)
  }
  function openEdit(card: Prospect, stageOverride?: Stage) {
    setEditingCard(card)
    setForceStage(stageOverride)
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditingCard(null); setForceStage(undefined) }

  function handleSaved(prospect: Prospect, isNew: boolean) {
    setCards(prev => isNew
      ? (prev.some(c => c.id === prospect.id) ? prev : [...prev, prospect])
      : prev.map(c => c.id === prospect.id ? prospect : c))
    closeModal()
  }

  // ── Drag & Drop ───────────────────────────────────────
  function onDragStart(e: React.DragEvent, id: string) {
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => setDraggingId(id))
  }
  function onDragEnd() {
    dragIdRef.current = null
    setDraggingId(null)
    setDragOverCol(null)
  }
  async function onDrop(e: React.DragEvent, colId: Stage) {
    e.preventDefault()
    setDragOverCol(null)
    const id = dragIdRef.current
    if (!id) return
    const card = cards.find(c => c.id === id)
    if (!card || card.stage === colId) return
    // Ao arrastar para Perdido, abre o modal para registrar o motivo antes de confirmar.
    if (colId === 'perdido') {
      openEdit(card, colId)
      return
    }
    const now = new Date().toISOString()
    const isClosing = colId === 'ganho'
    setCards(prev => prev.map(c => c.id === id ? { ...c, stage: colId, stage_since: now } : c))
    await supabase.from('prospects').update({
      stage: colId,
      stage_since: now,
      motivo_perda: null,
      ...(isClosing && !card.closed_at ? { closed_at: now, closed_by_id: userId } : {}),
      ...(!isClosing ? { closed_at: null, closed_by_id: null } : {}),
    }).eq('id', id)
  }

  // ── Render ────────────────────────────────────────────
  return (
    <main className="flex-1 p-4 sm:p-6 max-w-[1600px] mx-auto w-full space-y-4">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-text-dim hover:text-text flex items-center gap-1 text-sm shrink-0">
          <IBack /> Início
        </Link>
        <h1 className="font-display font-bold text-lg text-text shrink-0">Funil de Prospecção</h1>

        <div className="flex-1 min-w-[160px]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por empresa, nicho ou decisor…"
            className="w-full rounded px-3 py-1.5 text-sm bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>

        {isManager && (
          <select
            value={fResp}
            onChange={e => setFResp(e.target.value)}
            className="rounded px-2.5 py-1.5 text-sm bg-surface border border-border"
          >
            <option value="">Todos responsáveis</option>
            {team.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        )}

        <ThemeToggle className="theme-toggle" />

        <Button onClick={() => openNew()}>
          <span className="inline-flex items-center gap-1"><IPlus /> Novo prospect</span>
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-surface border border-border rounded p-3">
          <p className="text-2xl font-display font-bold text-text">{filtered.length}</p>
          <p className="text-xs text-text-dim">Total no funil</p>
        </div>
        <div className="bg-surface border border-border rounded p-3">
          <p className="text-2xl font-display font-bold text-accent">{openCount}</p>
          <p className="text-xs text-text-dim">Em aberto</p>
        </div>
        <div className="bg-surface border border-border rounded p-3">
          <p className="text-2xl font-display font-bold text-ok">{wonCards.length}</p>
          <p className="text-xs text-text-dim">Ganhos</p>
        </div>
        <div className="bg-surface border border-border rounded p-3">
          <p className="text-2xl font-display font-bold text-danger">{lostCards.length}</p>
          <p className="text-xs text-text-dim">Perdidos</p>
        </div>
        <div className="bg-surface border border-border rounded p-3">
          <p className="text-2xl font-display font-bold text-text">{conv}%</p>
          <p className="text-xs text-text-dim">Conversão · {money(revenue) || 'R$ 0'} ganho</p>
        </div>
      </div>

      {/* ── Board ── */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {STAGES.map(stage => {
          const baseCards = filtered
            .filter(c => c.stage === stage.id)
            .sort((a, b) => new Date(a.stage_since).getTime() - new Date(b.stage_since).getTime())

          // Perdidos parados > REACTIVATION_DAYS reaparecem como candidatos de reabordagem em Prospect.
          const reactivationExtra = stage.id === 'prospect'
            ? filtered.filter(c => c.stage === 'perdido' && daysSince(c.stage_since) > REACTIVATION_DAYS)
            : []
          const colCards = [...baseCards, ...reactivationExtra]

          return (
            <div key={stage.id} className="w-[260px] shrink-0 flex flex-col">
              <div className="flex items-center gap-2 px-1 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
                <h3 className="text-sm font-semibold text-text flex-1 truncate">{stage.name}</h3>
                <span className="text-xs font-mono text-text-faint">{colCards.length}</span>
                <button
                  onClick={() => openNew(stage.id)}
                  title="Adicionar aqui"
                  className="text-text-faint hover:text-accent w-5 h-5 flex items-center justify-center rounded hover:bg-surface-2 shrink-0"
                >
                  <IPlus />
                </button>
              </div>

              <div
                className={`flex-1 min-h-[120px] rounded space-y-2 p-1.5 transition-colors ${
                  dragOverCol === stage.id ? 'bg-accent-soft' : 'bg-surface-2'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOverCol(stage.id) }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
                }}
                onDrop={e => onDrop(e, stage.id)}
              >
                {colCards.length === 0 ? (
                  <div className="text-xs text-text-faint text-center py-6">Solte um card aqui</div>
                ) : colCards.map(card => {
                  const isExtra = stage.id === 'prospect' && card.stage === 'perdido'
                  const d = daysSince(card.stage_since)
                  const tempInfo = card.temperatura ? TEMPERATURA_INFO[card.temperatura] : null
                  const canalInfo = CANAL_INFO[card.canal]
                  const today = new Date().toISOString().slice(0, 10)

                  return (
                    <div
                      key={`${card.id}${isExtra ? '-react' : ''}`}
                      draggable={!isExtra}
                      onDragStart={!isExtra ? e => onDragStart(e, card.id) : undefined}
                      onDragEnd={!isExtra ? onDragEnd : undefined}
                      onClick={() => openEdit(card)}
                      className={`bg-surface border rounded p-3 space-y-1.5 cursor-pointer transition-colors hover:border-accent/50 ${
                        draggingId === card.id ? 'opacity-40' : ''
                      } ${isExtra ? 'border-warn/50' : 'border-border'}`}
                      style={{ borderLeftWidth: 3, borderLeftColor: isExtra ? 'var(--warn)' : stage.color }}
                    >
                      {isExtra && (
                        <p className="text-[11px] font-semibold text-warn leading-snug">
                          🔄 Perdido há {d} dia{d === 1 ? '' : 's'} — candidato a reabordagem
                        </p>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-text leading-tight truncate">{card.empresa}</p>
                        <span className="text-xs shrink-0" title={canalInfo.label}>{canalInfo.icon}</span>
                      </div>
                      {card.nicho && <p className="text-xs text-text-dim truncate">{card.nicho}</p>}
                      {card.decisor_nome && <p className="text-xs text-text-faint truncate">👤 {card.decisor_nome}</p>}

                      <div className="flex items-center gap-1 text-[11px] text-text-faint">
                        <IClock /> {d} dia{d === 1 ? '' : 's'} {isExtra ? 'perdido' : 'na etapa'}
                      </div>

                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {tempInfo && <Badge tone={tempInfo.tone}>{tempInfo.label}</Badge>}
                        {card.valor_potencial ? <Badge tone="accent" mono>{money(card.valor_potencial)}</Badge> : null}
                        {card.stage === 'perdido' && card.motivo_perda && (
                          <Badge tone="danger">{card.motivo_perda}</Badge>
                        )}
                        {!isExtra && !stage.type && card.return_date && card.return_date <= today && (
                          <Badge tone="warn">{card.return_date < today ? 'Retorno atrasado' : 'Retornar hoje'}</Badge>
                        )}
                        <span className="ml-auto text-[10px] font-semibold text-text-faint bg-surface-2 rounded-full w-5 h-5 flex items-center justify-center shrink-0" title={teamName(card.responsavel_id) ?? ''}>
                          {initials(teamName(card.responsavel_id))}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Card Modal ── */}
      {modalOpen && (
        <ProspectModal
          prospect={editingCard}
          presetStage={presetStage}
          forceStage={forceStage}
          team={team}
          userId={userId}
          userName={userName}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </main>
  )
}
