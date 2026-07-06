'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  STAGES, CANAL_INFO, TEMPERATURA_INFO, MOTIVOS_PERDA, REACTIVATION_DAYS, daysSince,
  type Prospect, type Stage, type Canal, type Temperatura,
} from '@/lib/prospects'

type Team = { id: string; full_name: string }

type FormData = {
  empresa: string; nicho: string; canal: Canal; responsavel_id: string
  stage: Stage; temperatura: Temperatura | ''; valor_potencial: string
  proxima_acao: string; return_date: string; motivo_perda: string
}

function emptyForm(stage: Stage = 'prospect'): FormData {
  return {
    empresa: '', nicho: '', canal: 'dm_instagram', responsavel_id: '',
    stage, temperatura: '', valor_potencial: '',
    proxima_acao: '', return_date: '', motivo_perda: '',
  }
}

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
  initialCards, userId, isManager, team,
}: {
  initialCards: Prospect[]
  userId: string
  userName: string
  isManager: boolean
  team: Team[]
}) {
  const [supabase] = useState(() => createClient())
  const [cards, setCards]         = useState<Prospect[]>(initialCards)
  const [fResp, setFResp]         = useState('')
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm]           = useState<FormData>(emptyForm())
  const [saving, setSaving]       = useState(false)
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
  function openNew(presetStage?: Stage) {
    setEditingId(null)
    setForm(emptyForm(presetStage || 'prospect'))
    setModalOpen(true)
  }
  function openEdit(card: Prospect) {
    setEditingId(card.id)
    setForm({
      empresa: card.empresa, nicho: card.nicho ?? '', canal: card.canal,
      responsavel_id: card.responsavel_id ?? '', stage: card.stage,
      temperatura: card.temperatura ?? '', valor_potencial: card.valor_potencial?.toString() ?? '',
      proxima_acao: card.proxima_acao ?? '', return_date: card.return_date ?? '',
      motivo_perda: card.motivo_perda ?? '',
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditingId(null) }

  function setF<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function saveCard() {
    if (!form.empresa.trim())      { alert('Informe o nome da empresa.'); return }
    if (!form.responsavel_id)      { alert('Selecione o responsável.'); return }
    setSaving(true)
    const existingCard = editingId ? cards.find(c => c.id === editingId) : null
    const isClosing = form.stage === 'ganho' || form.stage === 'perdido'
    const payload = {
      empresa: form.empresa.trim(),
      nicho: form.nicho.trim() || null,
      canal: form.canal,
      responsavel_id: form.responsavel_id,
      stage: form.stage,
      temperatura: form.temperatura || null,
      valor_potencial: form.valor_potencial ? Number(form.valor_potencial) : null,
      proxima_acao: form.proxima_acao.trim() || null,
      return_date: form.return_date || null,
      motivo_perda: form.stage === 'perdido' ? (form.motivo_perda || null) : null,
      ...(isClosing && !existingCard?.closed_at ? { closed_at: new Date().toISOString(), closed_by_id: userId } : {}),
      ...(!isClosing ? { closed_at: null, closed_by_id: null } : {}),
    }
    if (editingId) {
      const stageChanged = existingCard?.stage !== form.stage
      await supabase.from('prospects').update({
        ...payload,
        ...(stageChanged ? { stage_since: new Date().toISOString() } : {}),
      }).eq('id', editingId)
    } else {
      await supabase.from('prospects').insert([{ ...payload, stage_since: new Date().toISOString() }])
    }
    setSaving(false)
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
      openEdit({ ...card, stage: colId })
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
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full sm:max-w-lg bg-surface border border-border rounded-t sm:rounded shadow-2xl max-h-[90vh] flex flex-col">
            <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-display font-bold text-text text-base">
                {editingId ? 'Editar prospect' : 'Novo prospect'}
              </h2>
              <button onClick={closeModal} className="text-text-faint hover:text-text w-8 h-8 flex items-center justify-center rounded hover:bg-surface-2 text-xl leading-none">×</button>
            </header>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-dim mb-1">Empresa *</label>
                  <input
                    value={form.empresa}
                    onChange={e => setF('empresa', e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Nome da empresa"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim mb-1">Nicho</label>
                  <input
                    value={form.nicho}
                    onChange={e => setF('nicho', e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Ex.: clínica odontológica"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim mb-1">Canal *</label>
                  <select value={form.canal} onChange={e => setF('canal', e.target.value as Canal)} className="w-full rounded px-3 py-2 text-sm bg-surface border border-border">
                    {Object.entries(CANAL_INFO).map(([id, info]) => <option key={id} value={id}>{info.icon} {info.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim mb-1">Responsável *</label>
                  <select value={form.responsavel_id} onChange={e => setF('responsavel_id', e.target.value)} className="w-full rounded px-3 py-2 text-sm bg-surface border border-border">
                    <option value="">Selecione…</option>
                    {team.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim mb-1">Etapa</label>
                  <select value={form.stage} onChange={e => setF('stage', e.target.value as Stage)} className="w-full rounded px-3 py-2 text-sm bg-surface border border-border">
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim mb-1">Temperatura</label>
                  <select value={form.temperatura} onChange={e => setF('temperatura', e.target.value as Temperatura | '')} className="w-full rounded px-3 py-2 text-sm bg-surface border border-border">
                    <option value="">—</option>
                    {Object.entries(TEMPERATURA_INFO).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim mb-1">Valor potencial (R$)</label>
                  <input
                    type="number" min="0" step="100"
                    value={form.valor_potencial}
                    onChange={e => setF('valor_potencial', e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="0"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-dim mb-1">Próxima ação</label>
                  <input
                    value={form.proxima_acao}
                    onChange={e => setF('proxima_acao', e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Ex.: ligar amanhã de manhã"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim mb-1">Retornar em</label>
                  <input
                    type="date"
                    value={form.return_date}
                    onChange={e => setF('return_date', e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
                {form.stage === 'perdido' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-text-dim mb-1">Motivo da perda</label>
                    <select value={form.motivo_perda} onChange={e => setF('motivo_perda', e.target.value)} className="w-full rounded px-3 py-2 text-sm bg-surface border border-border">
                      <option value="">Selecione…</option>
                      {MOTIVOS_PERDA.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <p className="text-xs text-text-faint">
                Os demais campos (decisor, qualificação completa, observações e histórico de contatos) chegam na Fase 3.
              </p>
            </div>

            <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
              <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
              <Button onClick={saveCard} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </footer>
          </div>
        </div>
      )}
    </main>
  )
}
