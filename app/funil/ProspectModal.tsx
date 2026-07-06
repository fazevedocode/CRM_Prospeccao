'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import AiCardPanel from '@/components/AiCardPanel'
import {
  STAGES, CANAL_INFO, TEMPERATURA_INFO, FIT_INFO, TEM_VERBA_INFO, INVESTE_TRAFEGO_INFO,
  MOTIVOS_PERDA, daysSince,
  type Prospect, type Stage, type Canal, type Temperatura, type Fit, type TemVerba,
  type InvesteTrafego, type ContactLog,
} from '@/lib/prospects'
import { fillScriptVars, type ScriptRow } from '@/lib/scripts'

type Team = { id: string; full_name: string }

type FormData = {
  empresa: string; nicho: string; instagram: string; site: string; cidade: string; tamanho: string
  decisor_nome: string; decisor_cargo: string; telefone: string; decisor_instagram: string; email: string
  canal: Canal; responsavel_id: string; stage: Stage; return_date: string; proxima_acao: string; tentativas: string
  temperatura: Temperatura | ''; fit: Fit | ''; tem_verba: TemVerba | ''; investe_trafego: InvesteTrafego | ''; dor: string
  valor_potencial: string; servico_interesse: string
  observacoes: string; motivo_perda: string
}

function fromProspect(p: Prospect | null, presetStage: Stage, forceStage?: Stage): FormData {
  if (!p) {
    return {
      empresa: '', nicho: '', instagram: '', site: '', cidade: '', tamanho: '',
      decisor_nome: '', decisor_cargo: '', telefone: '', decisor_instagram: '', email: '',
      canal: 'dm_instagram', responsavel_id: '', stage: presetStage, return_date: '', proxima_acao: '', tentativas: '',
      temperatura: '', fit: '', tem_verba: '', investe_trafego: '', dor: '',
      valor_potencial: '', servico_interesse: '',
      observacoes: '', motivo_perda: '',
    }
  }
  return {
    empresa: p.empresa, nicho: p.nicho ?? '', instagram: p.instagram ?? '', site: p.site ?? '',
    cidade: p.cidade ?? '', tamanho: p.tamanho ?? '',
    decisor_nome: p.decisor_nome ?? '', decisor_cargo: p.decisor_cargo ?? '', telefone: p.telefone ?? '',
    decisor_instagram: p.decisor_instagram ?? '', email: p.email ?? '',
    canal: p.canal, responsavel_id: p.responsavel_id ?? '', stage: forceStage ?? p.stage,
    return_date: p.return_date ?? '', proxima_acao: p.proxima_acao ?? '', tentativas: p.tentativas?.toString() ?? '',
    temperatura: p.temperatura ?? '', fit: p.fit ?? '', tem_verba: p.tem_verba ?? '', investe_trafego: p.investe_trafego ?? '',
    dor: p.dor ?? '',
    valor_potencial: p.valor_potencial?.toString() ?? '', servico_interesse: p.servico_interesse ?? '',
    observacoes: p.observacoes ?? '', motivo_perda: p.motivo_perda ?? '',
  }
}

function money(v: number | null) {
  if (!v) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

const FIELD = 'w-full rounded px-3 py-2 text-sm bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent'
const LABEL = 'block text-xs font-semibold text-text-dim mb-1'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

export default function ProspectModal({
  prospect, presetStage = 'prospect', forceStage, team, userId, userName, onClose, onSaved,
}: {
  prospect: Prospect | null
  presetStage?: Stage
  /** Preenche a etapa inicial do form sem alterar o valor de comparação (ex.: drag até "Perdido"). */
  forceStage?: Stage
  team: Team[]
  userId: string
  userName: string
  onClose: () => void
  onSaved: (prospect: Prospect, isNew: boolean) => void
}) {
  const [supabase] = useState(() => createClient())
  const [form, setForm]   = useState<FormData>(() => fromProspect(prospect, presetStage, forceStage))
  const [saving, setSaving] = useState(false)

  const [contactLog, setContactLog]       = useState<ContactLog[]>([])
  const [addingContact, setAddingContact] = useState(false)
  const [contactNote, setContactNote]     = useState('')
  const [contactCanal, setContactCanal]   = useState<Canal>('cold_call')
  const [savingContact, setSavingContact] = useState(false)

  const [scripts, setScripts]     = useState<ScriptRow[]>([])
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null)

  const editingId = prospect?.id ?? null

  useEffect(() => {
    if (!editingId) return
    supabase
      .from('contact_log')
      .select('id, prospect_id, user_id, user_name, canal, note, contacted_at')
      .eq('prospect_id', editingId)
      .order('contacted_at', { ascending: false })
      .then(({ data }) => setContactLog((data as ContactLog[]) ?? []))
  }, [editingId, supabase])

  useEffect(() => {
    supabase
      .from('scripts')
      .select('id, nome, categoria, canal, ordem, body, ativo')
      .eq('ativo', true)
      .order('ordem')
      .then(({ data }) => setScripts((data as ScriptRow[]) ?? []))
  }, [supabase])

  async function copyScript(script: ScriptRow) {
    const filled = fillScriptVars(script.body, {
      empresa: form.empresa, decisor: form.decisor_nome, nicho: form.nicho,
    })
    try { await navigator.clipboard.writeText(filled) } catch { /* ignore */ }
    setCopiedScriptId(script.id)
    setTimeout(() => setCopiedScriptId(null), 2000)
  }

  function setF<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function saveCard() {
    if (!form.empresa.trim())  { alert('Informe o nome da empresa.'); return }
    if (!form.responsavel_id)  { alert('Selecione o responsável.'); return }
    setSaving(true)

    const isClosing = form.stage === 'ganho' || form.stage === 'perdido'
    const payload = {
      empresa: form.empresa.trim(),
      nicho: form.nicho.trim() || null,
      instagram: form.instagram.trim() || null,
      site: form.site.trim() || null,
      cidade: form.cidade.trim() || null,
      tamanho: form.tamanho.trim() || null,
      decisor_nome: form.decisor_nome.trim() || null,
      decisor_cargo: form.decisor_cargo.trim() || null,
      telefone: form.telefone.trim() || null,
      decisor_instagram: form.decisor_instagram.trim() || null,
      email: form.email.trim() || null,
      canal: form.canal,
      responsavel_id: form.responsavel_id,
      stage: form.stage,
      return_date: form.return_date || null,
      proxima_acao: form.proxima_acao.trim() || null,
      tentativas: form.tentativas ? Number(form.tentativas) : 0,
      temperatura: form.temperatura || null,
      fit: form.fit || null,
      tem_verba: form.tem_verba || null,
      investe_trafego: form.investe_trafego || null,
      dor: form.dor.trim() || null,
      valor_potencial: form.valor_potencial ? Number(form.valor_potencial) : null,
      servico_interesse: form.servico_interesse.trim() || null,
      observacoes: form.observacoes.trim() || null,
      motivo_perda: form.stage === 'perdido' ? (form.motivo_perda || null) : null,
      ...(isClosing && !prospect?.closed_at ? { closed_at: new Date().toISOString(), closed_by_id: userId } : {}),
      ...(!isClosing ? { closed_at: null, closed_by_id: null } : {}),
    }

    if (editingId) {
      const stageChanged = prospect?.stage !== form.stage
      const { data, error } = await supabase.from('prospects').update({
        ...payload,
        ...(stageChanged ? { stage_since: new Date().toISOString() } : {}),
      }).eq('id', editingId).select().single()
      if (error) alert(`Não foi possível salvar: ${error.message}`)
      else if (data) onSaved(data as Prospect, false)
    } else {
      const { data, error } = await supabase.from('prospects')
        .insert([{ ...payload, stage_since: new Date().toISOString() }])
        .select().single()
      if (error) alert(`Não foi possível salvar: ${error.message}`)
      else if (data) onSaved(data as Prospect, true)
    }
    setSaving(false)
  }

  async function saveContact() {
    if (!editingId || !contactNote.trim()) return
    setSavingContact(true)
    const entry = {
      prospect_id: editingId, user_id: userId, user_name: userName,
      canal: contactCanal, note: contactNote.trim(),
    }
    const { data, error } = await supabase.from('contact_log').insert(entry).select().single()
    if (error) {
      alert(`Não foi possível registrar o contato: ${error.message}`)
    } else if (data) {
      setContactLog(prev => [data as ContactLog, ...prev])
      setContactNote('')
      setAddingContact(false)
    }
    setSavingContact(false)
  }

  const stageInfo = STAGES.find(s => s.id === form.stage)
  const tempInfo  = form.temperatura ? TEMPERATURA_INFO[form.temperatura] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-2xl bg-surface border border-border rounded-t sm:rounded shadow-2xl max-h-[92vh] flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-text text-base truncate">
              {editingId ? form.empresa || 'Editar prospect' : 'Novo prospect'}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              {stageInfo && <Badge tone="neutral">{stageInfo.name}</Badge>}
              {tempInfo && <Badge tone={tempInfo.tone}>{tempInfo.label}</Badge>}
            </div>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text w-8 h-8 flex items-center justify-center rounded hover:bg-surface-2 text-xl leading-none shrink-0">×</button>
        </header>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

          <Section title="Empresa">
            <div className="sm:col-span-2">
              <label className={LABEL}>Empresa *</label>
              <input value={form.empresa} onChange={e => setF('empresa', e.target.value)} className={FIELD} placeholder="Nome da empresa" autoFocus />
            </div>
            <div>
              <label className={LABEL}>Nicho</label>
              <input value={form.nicho} onChange={e => setF('nicho', e.target.value)} className={FIELD} placeholder="Ex.: clínica odontológica" />
            </div>
            <div>
              <label className={LABEL}>Tamanho</label>
              <input value={form.tamanho} onChange={e => setF('tamanho', e.target.value)} className={FIELD} placeholder="Ex.: 1-10 funcionários" />
            </div>
            <div>
              <label className={LABEL}>Instagram</label>
              <input value={form.instagram} onChange={e => setF('instagram', e.target.value)} className={FIELD} placeholder="@empresa" />
            </div>
            <div>
              <label className={LABEL}>Site</label>
              <input value={form.site} onChange={e => setF('site', e.target.value)} className={FIELD} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Cidade</label>
              <input value={form.cidade} onChange={e => setF('cidade', e.target.value)} className={FIELD} placeholder="Cidade / UF" />
            </div>
          </Section>

          <Section title="Decisor">
            <div>
              <label className={LABEL}>Nome</label>
              <input value={form.decisor_nome} onChange={e => setF('decisor_nome', e.target.value)} className={FIELD} placeholder="Nome do decisor" />
            </div>
            <div>
              <label className={LABEL}>Cargo</label>
              <input value={form.decisor_cargo} onChange={e => setF('decisor_cargo', e.target.value)} className={FIELD} placeholder="Ex.: sócio, gerente" />
            </div>
            <div>
              <label className={LABEL}>Telefone</label>
              <input value={form.telefone} onChange={e => setF('telefone', e.target.value)} className={FIELD} placeholder="(83) 9 9999-9999" />
            </div>
            <div>
              <label className={LABEL}>Instagram do decisor</label>
              <input value={form.decisor_instagram} onChange={e => setF('decisor_instagram', e.target.value)} className={FIELD} placeholder="@decisor" />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Email</label>
              <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} className={FIELD} placeholder="email@empresa.com" />
            </div>
          </Section>

          <Section title="Prospecção">
            <div>
              <label className={LABEL}>Canal *</label>
              <select value={form.canal} onChange={e => setF('canal', e.target.value as Canal)} className={FIELD}>
                {Object.entries(CANAL_INFO).map(([id, info]) => <option key={id} value={id}>{info.icon} {info.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Responsável *</label>
              <select value={form.responsavel_id} onChange={e => setF('responsavel_id', e.target.value)} className={FIELD}>
                <option value="">Selecione…</option>
                {team.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Etapa</label>
              <select value={form.stage} onChange={e => setF('stage', e.target.value as Stage)} className={FIELD}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Tentativas</label>
              <input type="number" min="0" value={form.tentativas} onChange={e => setF('tentativas', e.target.value)} className={FIELD} placeholder="0" />
            </div>
            <div>
              <label className={LABEL}>Próxima ação</label>
              <input value={form.proxima_acao} onChange={e => setF('proxima_acao', e.target.value)} className={FIELD} placeholder="Ex.: ligar amanhã de manhã" />
            </div>
            <div>
              <label className={LABEL}>Retornar em</label>
              <input type="date" value={form.return_date} onChange={e => setF('return_date', e.target.value)} className={FIELD} />
            </div>
            {form.stage === 'perdido' && (
              <div className="sm:col-span-2">
                <label className={LABEL}>Motivo da perda</label>
                <select value={form.motivo_perda} onChange={e => setF('motivo_perda', e.target.value)} className={FIELD}>
                  <option value="">Selecione…</option>
                  {MOTIVOS_PERDA.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
          </Section>

          <Section title="Qualificação">
            <div>
              <label className={LABEL}>Temperatura</label>
              <select value={form.temperatura} onChange={e => setF('temperatura', e.target.value as Temperatura | '')} className={FIELD}>
                <option value="">—</option>
                {Object.entries(TEMPERATURA_INFO).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Fit</label>
              <select value={form.fit} onChange={e => setF('fit', e.target.value as Fit | '')} className={FIELD}>
                <option value="">—</option>
                {Object.entries(FIT_INFO).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Tem verba?</label>
              <select value={form.tem_verba} onChange={e => setF('tem_verba', e.target.value as TemVerba | '')} className={FIELD}>
                <option value="">—</option>
                {Object.entries(TEM_VERBA_INFO).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Já investe em tráfego?</label>
              <select value={form.investe_trafego} onChange={e => setF('investe_trafego', e.target.value as InvesteTrafego | '')} className={FIELD}>
                <option value="">—</option>
                {Object.entries(INVESTE_TRAFEGO_INFO).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Dor</label>
              <input value={form.dor} onChange={e => setF('dor', e.target.value)} className={FIELD} placeholder="Qual a principal dor do negócio?" />
            </div>
          </Section>

          <Section title="Valor">
            <div>
              <label className={LABEL}>Valor potencial (R$)</label>
              <input type="number" min="0" step="100" value={form.valor_potencial} onChange={e => setF('valor_potencial', e.target.value)} className={FIELD} placeholder="0" />
            </div>
            <div>
              <label className={LABEL}>Serviço de interesse</label>
              <input value={form.servico_interesse} onChange={e => setF('servico_interesse', e.target.value)} className={FIELD} placeholder="Ex.: tráfego pago + social media" />
            </div>
          </Section>

          <div className="space-y-1.5">
            <label className={LABEL}>Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setF('observacoes', e.target.value)}
              className={FIELD}
              rows={3}
              placeholder="Contexto, objeções, anotações…"
            />
          </div>

          {/* ── Scripts de abordagem ── */}
          {scripts.length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-text-faint">Scripts de abordagem</h4>
              <p className="text-xs text-text-faint">Copia já com [EMPRESA]/[DECISOR]/[NICHO] preenchidos com os dados acima.</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {scripts
                  .slice()
                  .sort((a, b) => (a.canal === form.canal ? -1 : 0) - (b.canal === form.canal ? -1 : 0))
                  .map(script => (
                    <div key={script.id} className="flex items-center justify-between gap-2 bg-surface-2 rounded px-3 py-1.5">
                      <span className="text-sm text-text truncate">
                        <span title={CANAL_INFO[script.canal as Canal]?.label ?? script.canal}>
                          {CANAL_INFO[script.canal as Canal]?.icon ?? '💬'}
                        </span>{' '}
                        {script.nome}
                      </span>
                      <button
                        onClick={() => copyScript(script)}
                        className="text-xs font-medium text-accent hover:opacity-80 shrink-0"
                      >
                        {copiedScriptId === script.id ? '✓ Copiado' : '📋 Copiar'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── IA: resumo, sugestão e geração de script ── */}
          {editingId && <AiCardPanel prospectId={editingId} />}

          {/* ── Histórico de contatos ── */}
          {editingId && (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-text-faint">Histórico de contatos</h4>
                {!addingContact && (
                  <Button variant="ghost" onClick={() => setAddingContact(true)}>+ Registrar contato</Button>
                )}
              </div>

              {addingContact && (
                <div className="bg-surface-2 rounded p-3 space-y-2">
                  <select value={contactCanal} onChange={e => setContactCanal(e.target.value as Canal)} className={FIELD}>
                    {Object.entries(CANAL_INFO).map(([id, info]) => <option key={id} value={id}>{info.icon} {info.label}</option>)}
                  </select>
                  <textarea
                    value={contactNote}
                    onChange={e => setContactNote(e.target.value)}
                    className={FIELD}
                    rows={2}
                    placeholder="O que foi conversado…"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveContact} disabled={savingContact || !contactNote.trim()}>
                      {savingContact ? 'Salvando…' : 'Registrar'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setAddingContact(false); setContactNote('') }}>Cancelar</Button>
                  </div>
                </div>
              )}

              {contactLog.length === 0 ? (
                <p className="text-sm text-text-faint">Nenhum contato registrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {contactLog.map(entry => (
                    <div key={entry.id} className="bg-surface-2 rounded p-2.5 text-sm">
                      <div className="flex items-center gap-2 text-xs text-text-faint mb-1">
                        <span>{CANAL_INFO[entry.canal]?.icon ?? '💬'}</span>
                        <b className="text-text-dim">{entry.user_name}</b>
                        <span>
                          {new Date(entry.contacted_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-text">{entry.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {prospect && (
            <p className="text-xs text-text-faint">
              No funil desde {new Date(prospect.created_at).toLocaleDateString('pt-BR')} · há {daysSince(prospect.stage_since)} dia(s) na etapa atual
              {prospect.valor_potencial ? ` · potencial ${money(prospect.valor_potencial)}` : ''}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={saveCard} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </footer>
      </div>
    </div>
  )
}
