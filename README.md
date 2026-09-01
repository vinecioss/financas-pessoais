# Caderno

Controle financeiro pessoal — Next.js (App Router) + TypeScript + Tailwind + Supabase.

Todo o código já está pronto. Falta apenas conectar o projeto a um banco Supabase (passos abaixo) para rodar.

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com), crie uma conta (se ainda não tiver) e clique em **New project**.
2. Escolha um nome (ex: `caderno`), uma senha para o banco e a região mais próxima.
3. Aguarde o projeto terminar de provisionar (leva ~2 minutos).

## 2. Rodar o SQL do banco

1. No painel do Supabase, abra **SQL Editor**.
2. Cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
   - Isso cria as tabelas `categories`, `transactions` e `budgets`, ativa Row Level Security (cada usuário só acessa os próprios dados) e cria um gatilho que popula automaticamente as categorias padrão sempre que um novo usuário for criado.

## 3. Criar seu usuário

1. No painel do Supabase, vá em **Authentication → Users → Add user**.
2. Crie o usuário com e-mail e senha (marque **Auto Confirm User**, já que não há fluxo de confirmação por e-mail neste app).
3. Ao criar o usuário, o gatilho do banco já popula as categorias padrão automaticamente.

## 4. Configurar as variáveis de ambiente

No painel do Supabase, vá em **Project Settings → API** e copie:

- **Project URL**
- **anon public key**

Cole esses valores no arquivo [`.env.local`](.env.local), que já está criado na raiz do projeto:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 5. Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado para a tela de login. Entre com o e-mail e senha que criou no passo 3.

Para testar a importação de CSV, use o arquivo [`exemplo-extrato.csv`](exemplo-extrato.csv) na aba Importar.

## 6. Deploy na Vercel

1. Suba o repositório para o GitHub (ou outro provedor Git suportado pela Vercel).
2. Em [vercel.com](https://vercel.com), clique em **New Project** e importe o repositório.
3. Em **Environment Variables**, adicione as mesmas duas variáveis do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.

## Estrutura do projeto

```
src/
  app/
    login/              tela de login
    (app)/              rotas protegidas (exigem sessão Supabase)
      painel/            dashboard do mês
      lancamentos/       CRUD de ganhos e gastos
      categorias/        categorias e orçamentos mensais
      importar/          importação de extrato CSV
  components/            componentes de UI compartilhados
  lib/
    supabase/            clientes Supabase (browser, server, middleware)
    queries.ts           todas as chamadas ao banco (CRUD)
    csv.ts                parsing e detecção de colunas do CSV
    format.ts, constants.ts
  types/database.ts       tipos das tabelas
  middleware.ts            protege rotas exigindo login
supabase/schema.sql        SQL completo (tabelas, RLS, seed de categorias)
```

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- Supabase (Auth + Postgres + RLS)
- Recharts (gráfico de rosca)
- Papaparse (leitura de CSV)
