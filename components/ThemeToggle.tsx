'use client'

import { useEffect, useState } from 'react'

const Sun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
)

const Moon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    // Lê o estado já aplicado pelo script anti-flash do layout — só existe no cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('radar-theme', next ? 'dark' : 'light') } catch {}
  }

  // Placeholder com mesma dimensão para evitar layout shift durante hidratação
  if (dark === null) {
    return <span className={className} style={{ display: 'inline-flex', width: 36, height: 36 }} aria-hidden />
  }

  return (
    <button
      onClick={toggle}
      className={className}
      title={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label={dark ? 'Tema claro' : 'Tema escuro'}
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  )
}
