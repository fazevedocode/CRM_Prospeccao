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

Para os recursos de IA (resumo do prospect, geração de scripts, assistente de chat),
preencha `GEMINI_API_KEY` no `.env` com uma chave de https://aistudio.google.com/apikey.
Sem a chave, esses recursos mostram uma mensagem amigável em vez de quebrar.

## Fases

1. **Base reutilizável** — design system, auth + RBAC (profiles/roles), skeleton de páginas
2. Funil de prospecção (Kanban)
3. Card do prospect (form + histórico de contatos)
4. **Scripts + IA** — painel de scripts, resumo/sugestão do prospect, geração de script
   personalizado e assistente de chat com plumbing pronta para as futuras funções SQL de
   métricas do funil (`funil_pipeline_atual`, `funil_conversao_periodo`,
   `funil_perdidos_motivo`, `funil_performance_equipe`)