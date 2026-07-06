'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'

const INPUT = [
  'w-full rounded px-3 py-2 text-sm bg-surface text-text',
  'border border-border',
  'focus:outline-none focus:ring-2',
  'focus:ring-accent focus:border-accent',
].join(' ')

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos.'
          : 'Erro ao entrar. Tente novamente.'
      )
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg px-4">
      <ThemeToggle className="theme-toggle absolute top-4 right-4" />

      <div className="bg-surface border border-border rounded shadow-[var(--card-shadow)] dark:shadow-none p-8 w-full max-w-sm space-y-6">

        {/* Marca */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-accent mb-2">
            <span className="text-accent-text font-display font-black text-lg tracking-tight">RD</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text">Radar CRM</h1>
          <p className="text-sm text-text-dim">Faça login para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text mb-1">
              Email
            </label>
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className={INPUT}
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-1">
              Senha
            </label>
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              className={INPUT}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-accent text-accent-text font-semibold rounded py-2.5 text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
