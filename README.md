# Radar CRM

CRM de prospecção ativa B2B (tráfego pago e marketing) — Next.js App Router, TypeScript, Tailwind v4 e Supabase.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (auth, banco, RLS)

## Setup

```bash
npm install
cp .env .env.local # já preenchido com as credenciais do projeto Supabase
npm run dev
```

## Fases

1. **Base reutilizável** — design system, auth + RBAC (profiles/roles), skeleton de páginas
2. Funil de prospecção (Kanban)
3. Card do prospect (form + histórico de contatos)
4. Scripts + IA (resumo, sugestão de abordagem)