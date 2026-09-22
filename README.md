# Caderno

Aplicativo pessoal de controle financeiro feito com Next.js, TypeScript,
Tailwind CSS, Neon Postgres, Neon Data API e Managed Better Auth.

## Configuração local

Copie `.env.example` para `.env.local` e preencha:

```dotenv
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
NEXT_PUBLIC_NEON_DATA_API_URL=
```

- `NEON_AUTH_BASE_URL`: URL do Managed Better Auth da branch.
- `NEON_AUTH_COOKIE_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `NEXT_PUBLIC_NEON_DATA_API_URL`: URL da Data API da mesma branch.

Depois execute:

```bash
npm install
npm run dev
```

O servidor local usa [http://localhost:3001](http://localhost:3001).

## Deploy na Vercel

Configure as mesmas três variáveis nos ambientes Production e Preview do
projeto na Vercel. O domínio publicado e `http://localhost:3001` precisam estar
na lista de origens autorizadas do Managed Better Auth.

## Banco e segurança

O schema está em `neon/migrations/001_initial_schema.sql`. As tabelas
financeiras usam RLS com `auth.user_id()` e aceitam acesso da Data API somente
para usuários autenticados. Chaves estrangeiras compostas impedem relações
entre registros de usuários diferentes e também impedem uma despesa de usar
uma categoria de receita.

Os scripts em `scripts/` validam, importam e conferem os backups CSV sem expor
a connection string. O processo completo está em `docs/neon-migration.md`.

## Verificações

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Para testar a importação de extrato pela interface, use
`exemplo-extrato.csv`.

## Stack

- Next.js 16 com App Router
- React 19 e TypeScript
- Tailwind CSS v4
- Neon Postgres, Data API e Managed Better Auth
- Recharts
- Papa Parse
