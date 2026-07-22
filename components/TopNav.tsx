'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import { ThemeToggle } from './ThemeToggle'

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

type NavItem = {
  label: string
  href?: string
  perm?: string | string[]
  /** Sempre desabilitado — teaser de funcionalidade futura */
  comingSoon?: boolean
  /** Ativo se user tem permissão; [em breve] se não tem */
  comingSoonIfNoPerm?: boolean
}

type NavGroup = {
  id: string
  label: string
  href?: string             // Link direto (sem dropdown)
  perm?: string | string[]  // Permissão para links diretos
  items?: (NavItem | '---')[]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Estrutura de menus — as fases seguintes habilitam os itens "em breve"
// ─────────────────────────────────────────────────────────────────────────────

const NAV: NavGroup[] = [
  { id: 'painel', label: 'Painel', href: '/' },
  { id: 'funil', label: 'Funil', href: '/funil' },
  { id: 'scripts', label: 'Scripts', href: '/scripts' },
  { id: 'diagnostico-google', label: 'Diagnóstico Google', href: '/diagnostico-google' },
  {
    id: 'relatorios',
    label: 'Relatórios',
    items: [
      { label: 'Metas da equipe', comingSoon: true },
      { label: 'Performance do funil', comingSoon: true },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers de permissão
// ─────────────────────────────────────────────────────────────────────────────

function hasPerm(perms: Set<string>, perm?: string | string[]): boolean {
  if (!perm) return true
  return Array.isArray(perm) ? perm.some(p => perms.has(p)) : perms.has(perm)
}

function isItemVisible(item: NavItem, perms: Set<string>): boolean {
  if (item.comingSoon || item.comingSoonIfNoPerm) return true
  return hasPerm(perms, item.perm)
}

function isItemClickable(item: NavItem, perms: Set<string>): boolean {
  if (item.comingSoon) return false
  if (item.comingSoonIfNoPerm) return hasPerm(perms, item.perm)
  return hasPerm(perms, item.perm)
}

function isGroupVisible(group: NavGroup, perms: Set<string>): boolean {
  if (group.href) return hasPerm(perms, group.perm)
  return (group.items ?? []).some(i => i !== '---' && isItemVisible(i, perms))
}

function matchesPath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

function isGroupActive(group: NavGroup, pathname: string): boolean {
  if (group.href) return matchesPath(group.href, pathname)
  return (group.items ?? []).some(i => i !== '---' && !!i.href && matchesPath(i.href, pathname))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function ComingSoonBadge() {
  return (
    <span className="ml-auto pl-2 text-[9px] font-bold uppercase tracking-wide bg-surface-2 text-text-faint px-1.5 py-0.5 rounded-sm whitespace-nowrap">
      Em breve
    </span>
  )
}

function Chevron({ rotated }: { rotated: boolean }) {
  return (
    <svg
      className={`w-3 h-3 shrink-0 transition-transform duration-150 ${rotated ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function DropdownItem({
  item, perms, pathname, onClose,
}: {
  item: NavItem; perms: Set<string>; pathname: string; onClose: () => void
}) {
  if (!isItemVisible(item, perms)) return null
  const clickable = isItemClickable(item, perms)
  const isActive  = !!item.href && matchesPath(item.href, pathname)

  if (!clickable) {
    return (
      <div
        className="flex items-center px-3.5 py-2 text-sm text-text-faint cursor-not-allowed select-none"
        title="Em breve"
      >
        <span className="flex-1">{item.label}</span>
        <ComingSoonBadge />
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      onClick={onClose}
      className={`flex items-center px-3.5 py-2 text-sm transition-colors mx-1 rounded ${
        isActive
          ? 'text-accent bg-accent-soft font-semibold'
          : 'text-text hover:bg-surface-2 hover:text-text'
      }`}
    >
      {item.label}
    </Link>
  )
}

function MobileItem({
  item, perms, pathname, onClose,
}: {
  item: NavItem; perms: Set<string>; pathname: string; onClose: () => void
}) {
  if (!isItemVisible(item, perms)) return null
  const clickable = isItemClickable(item, perms)
  const isActive  = !!item.href && matchesPath(item.href, pathname)

  if (!clickable) {
    return (
      <div className="flex items-center px-3 py-2 text-sm text-text-faint cursor-not-allowed rounded select-none">
        <span className="flex-1">{item.label}</span>
        <ComingSoonBadge />
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      onClick={onClose}
      className={`flex items-center px-3 py-2 rounded text-sm transition-colors ${
        isActive
          ? 'text-accent bg-accent-soft font-semibold'
          : 'text-text-dim hover:bg-surface-2 hover:text-text'
      }`}
    >
      {item.label}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function TopNav({
  permissions,
  displayName,
  roleName,
}: {
  permissions: string[]
  displayName: string
  roleName: string
}) {
  const pathname = usePathname()
  const perms    = new Set(permissions)

  const [openGroup,      setOpenGroup]      = useState<string | null>(null)
  const [mobileOpen,     setMobileOpen]     = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const barRef = useRef<HTMLElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenGroup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fecha ao navegar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenGroup(null)
    setMobileOpen(false)
  }, [pathname])

  // Bloqueia scroll do body no mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const visibleGroups = NAV.filter(g => isGroupVisible(g, perms))

  // ── Estilos base ───────────────────────────────────────────────────────────
  const MENU_BTN = 'flex items-center gap-1 h-8 px-2.5 rounded text-[13px] font-medium transition-colors whitespace-nowrap'
  const MENU_IDLE = 'text-text-dim hover:bg-surface-2 hover:text-text'
  const MENU_ACTIVE = 'text-accent bg-accent-soft'

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP
          ══════════════════════════════════════════════════════════════════ */}
      <header
        ref={barRef}
        className="hidden xl:flex items-center gap-0.5 px-3 h-12 shrink-0
          bg-surface
          border-b border-border
          sticky top-0 z-40"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 px-2 mr-1 shrink-0 group">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
            <span className="text-accent-text font-black text-[10px] tracking-tight">RD</span>
          </div>
          <span className="font-bold text-[13px] text-text group-hover:text-accent transition-colors">
            Radar CRM
          </span>
        </Link>

        <div className="w-px h-5 bg-border mr-1 shrink-0" />

        {/* Grupos */}
        <nav className="flex items-center gap-0 flex-1 min-w-0 overflow-visible">
          {visibleGroups.map(group => {
            const active = isGroupActive(group, pathname)
            const labelClass = `${MENU_BTN} ${active ? MENU_ACTIVE : MENU_IDLE}`

            if (group.href) {
              return (
                <Link key={group.id} href={group.href} className={labelClass}>
                  {group.label}
                </Link>
              )
            }

            const dropOpen = openGroup === group.id

            return (
              <div key={group.id} className="relative">
                <button
                  onClick={() => setOpenGroup(p => p === group.id ? null : group.id)}
                  className={`${MENU_BTN} ${dropOpen ? MENU_ACTIVE : active ? MENU_ACTIVE : MENU_IDLE}`}
                >
                  {group.label}
                  <Chevron rotated={dropOpen} />
                </button>

                {dropOpen && (
                  <div className="absolute top-full left-0 mt-1.5 min-w-[210px] rounded border border-border bg-surface shadow-xl py-1.5 z-50">
                    {(group.items ?? []).map((item, idx) =>
                      item === '---'
                        ? <hr key={`s${idx}`} className="my-1 border-border mx-3" />
                        : <DropdownItem key={item.label} item={item} perms={perms} pathname={pathname} onClose={() => setOpenGroup(null)} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Lado direito */}
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <span className="text-xs text-text-dim hidden xl:block truncate max-w-[130px]">
            {displayName}
          </span>
          <ThemeToggle className="theme-toggle" />
          <LogoutButton />
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE — barra superior
          ══════════════════════════════════════════════════════════════════ */}
      <header className="xl:hidden flex items-center justify-between px-4 h-12 shrink-0 bg-surface border-b border-border sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
            <span className="text-accent-text font-black text-[10px]">RD</span>
          </div>
          <span className="font-bold text-[13px] text-text">Radar CRM</span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="flex flex-col justify-center gap-[5px] w-9 h-9 rounded border border-border bg-surface hover:border-accent/40 transition-colors px-2 shrink-0"
          >
            <span className="block w-full h-[2px] bg-text-dim rounded-sm" />
            <span className="block w-full h-[2px] bg-text-dim rounded-sm" />
            <span className="block w-[65%] h-[2px] bg-text-dim rounded-sm" />
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE — backdrop
          ══════════════════════════════════════════════════════════════════ */}
      <div
        className={`xl:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE — drawer lateral
          ══════════════════════════════════════════════════════════════════ */}
      <aside
        className={`xl:hidden fixed top-0 left-0 h-full w-72 z-50 flex flex-col
          bg-surface
          border-r border-border
          shadow-xl transition-transform duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Cabeçalho do drawer */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
              <span className="text-accent-text font-black text-xs">RD</span>
            </div>
            <div>
              <p className="text-sm font-bold text-text leading-tight">Radar CRM</p>
              <p className="text-[11px] text-text-faint capitalize">{roleName}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="w-7 h-7 flex items-center justify-center rounded text-text-faint hover:bg-surface-2 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm font-semibold transition-colors mb-1 ${
              pathname === '/'
                ? 'bg-accent-soft text-accent'
                : 'text-text-dim hover:bg-surface-2 hover:text-text'
            }`}
          >
            🏠 Início
          </Link>

          {visibleGroups.map(group => {
            if (group.href) {
              const active = isGroupActive(group, pathname)
              return (
                <Link
                  key={group.id}
                  href={group.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'text-text-dim hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  {group.label}
                </Link>
              )
            }

            const expanded = mobileExpanded === group.id
            const active   = isGroupActive(group, pathname)

            return (
              <div key={group.id}>
                <button
                  onClick={() => setMobileExpanded(p => p === group.id ? null : group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-sm font-semibold transition-colors ${
                    active && !expanded
                      ? 'text-accent bg-accent-soft'
                      : 'text-text-dim hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  <span>{group.label}</span>
                  <Chevron rotated={expanded} />
                </button>

                {expanded && (
                  <div className="ml-3 mt-0.5 mb-1 border-l-2 border-border pl-3 space-y-0.5">
                    {(group.items ?? []).map((item, idx) =>
                      item === '---'
                        ? <hr key={`s${idx}`} className="my-1 border-border" />
                        : <MobileItem key={item.label} item={item} perms={perms} pathname={pathname} onClose={() => setMobileOpen(false)} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Rodapé do drawer */}
        <div className="px-4 py-3 border-t border-border flex items-center gap-2 shrink-0">
          <p className="text-xs text-text-faint truncate flex-1">{displayName}</p>
          <ThemeToggle className="theme-toggle" />
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}
