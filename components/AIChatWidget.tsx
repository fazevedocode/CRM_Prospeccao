'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const IDLE_MS  = 15 * 60 * 1000   // 15 minutos
const LS_MSGS  = 'radar-ai-msgs'
const LS_LAST  = 'radar-ai-last'

const TIMEOUT_MSG =
  '⏱️ Conversa encerrada por inatividade (15 min sem mensagens). ' +
  'Envie uma nova mensagem para iniciar uma nova conversa.'

export default function AIChatWidget() {
  const pathname = usePathname()
  const [open, setOpen]       = useState(false)
  const [messages, setMsgs]   = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleIdle(delay = IDLE_MS) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setMsgs([{ id: `idle-${Date.now()}`, role: 'assistant', content: TIMEOUT_MSG }])
      try {
        localStorage.removeItem(LS_MSGS)
        localStorage.removeItem(LS_LAST)
      } catch {}
    }, delay)
  }

  useEffect(() => {
    try {
      const raw     = localStorage.getItem(LS_MSGS)
      const lastRaw = localStorage.getItem(LS_LAST)
      if (!raw || !lastRaw) return

      const elapsed = Date.now() - parseInt(lastRaw, 10)
      if (elapsed >= IDLE_MS) {
        localStorage.removeItem(LS_MSGS)
        localStorage.removeItem(LS_LAST)
        return
      }

      // Restaura a conversa persistida ao montar — só existe no cliente.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMsgs(JSON.parse(raw))
      scheduleIdle(IDLE_MS - elapsed)
    } catch {}
  }, [])

  useEffect(() => {
    if (messages.length === 0) return
    try { localStorage.setItem(LS_MSGS, JSON.stringify(messages)) } catch {}
  }, [messages])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMsgs(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try { localStorage.setItem(LS_LAST, Date.now().toString()) } catch {}
    scheduleIdle()

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMsgs(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Não consegui processar sua pergunta. Tente novamente.',
      }])
    } catch {
      setMsgs(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Ocorreu um erro de conexão. Tente novamente em instantes.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function clearChat() {
    setMsgs([])
    setInput('')
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      localStorage.removeItem(LS_MSGS)
      localStorage.removeItem(LS_LAST)
    } catch {}
  }

  if (pathname === '/login') return null

  const isEmpty = messages.length === 0

  return (
    <>
      <div
        className={`sm:hidden fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <div
        className={`
          fixed z-[60]
          bottom-0 left-0 right-0
          sm:bottom-[88px] sm:right-5 sm:left-auto sm:w-[380px]
          transition-all duration-200 ease-out
          ${open
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none translate-y-3'
          }
        `}
        aria-hidden={!open}
      >
        <div className="
          bg-surface
          rounded-t sm:rounded
          border border-border
          shadow-2xl flex flex-col
          h-[88svh] sm:h-auto sm:max-h-[72vh]
          overflow-hidden
        ">
          <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-accent">
            <div className="flex items-center gap-2">
              <span className="text-accent-text text-base leading-none">✨</span>
              <span className="text-accent-text font-display font-semibold text-sm">Assistente Radar</span>
            </div>
            <div className="flex items-center gap-1">
              {!isEmpty && (
                <button
                  onClick={clearChat}
                  className="text-accent-text/80 hover:text-accent-text text-xs px-2 py-1 rounded hover:bg-accent-text/15 transition-colors"
                >
                  Limpar
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar assistente"
                className="w-7 h-7 flex items-center justify-center rounded text-accent-text/80 hover:text-accent-text hover:bg-accent-text/15 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isEmpty && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 select-none">
                <span className="text-4xl mb-3">✨</span>
                <p className="text-sm font-display font-semibold text-text">
                  Assistente Radar CRM
                </p>
                <p className="text-xs text-text-faint mt-1 max-w-[240px] leading-relaxed">
                  Pergunte qual script usar, como abordar um nicho ou sobre os números do funil.
                </p>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] rounded px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'rounded-br-sm bg-accent text-accent-text'
                      : 'rounded-bl-sm bg-surface-2 text-text'
                    }
                  `}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-2 rounded rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        className="w-2 h-2 rounded-full bg-text-faint animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-border flex gap-2 items-end shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo… (Enter para enviar)"
              rows={1}
              disabled={loading}
              className="
                flex-1 resize-none rounded
                border border-border
                px-3 py-2 text-sm
                bg-surface
                text-text
                placeholder:text-text-faint
                focus:outline-none focus:border-accent
                transition-colors max-h-32 overflow-y-auto
                disabled:opacity-60
              "
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Enviar mensagem"
              className="w-9 h-9 rounded flex items-center justify-center shrink-0 transition-opacity disabled:opacity-35 bg-accent text-accent-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Fechar assistente' : 'Abrir Assistente Radar'}
        className={`
          fixed bottom-5 right-5 z-[60]
          w-14 h-14 rounded-full
          shadow-lg shadow-black/20
          items-center justify-center
          transition-transform duration-150
          hover:scale-105 active:scale-95
          bg-accent text-accent-text
          ${open ? 'hidden sm:flex' : 'flex'}
        `}
      >
        <div className={`transition-transform duration-200 ${open ? 'rotate-90 scale-90' : 'rotate-0 scale-100'}`}>
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="9" cy="10" r="0.5" fill="currentColor" />
              <circle cx="12" cy="10" r="0.5" fill="currentColor" />
              <circle cx="15" cy="10" r="0.5" fill="currentColor" />
            </svg>
          )}
        </div>
      </button>
    </>
  )
}
