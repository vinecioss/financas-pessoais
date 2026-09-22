# Migração do Caderno para o Neon

Migração concluída em 21 de setembro de 2026. O schema, os dados, a
autenticação e o acesso do aplicativo passaram para o Neon. Nenhum comando
deste processo apagou, pausou ou modificou o projeto Supabase.

## Objetivo desta etapa

- Criar um schema novo e seguro no Neon.
- Criar um usuário novo no Managed Better Auth.
- Preservar os UUIDs de todos os registros financeiros.
- Substituir somente o `user_id` antigo pelo UUID do usuário novo do Neon.
- Validar todos os relacionamentos antes da primeira inserção.
- Importar os cinco CSVs em uma única transação.

## Proteções implementadas

As chaves estrangeiras usam `user_id` junto com o ID relacionado. Isso impede,
no próprio Postgres, que uma transação de um usuário aponte para categoria,
conta ou lançamento fixo de outro usuário.

O tipo também participa das relações com categorias e lançamentos fixos. Uma
despesa não pode apontar para uma categoria de receita, por exemplo.

As tabelas usam RLS com `auth.user_id()` e concedem acesso pela Data API apenas
ao papel `authenticated`. O papel anônimo não recebe acesso às tabelas
financeiras.

## Arquivos locais e credenciais

Crie uma cópia de `.env.migration.example` chamada `.env.migration`. Preencha
os valores somente nesse arquivo local:

```dotenv
DATABASE_URL=
NEON_USER_ID=
MIGRATION_CSV_DIR=migration-data
```

`.env.migration` e `migration-data/` são ignorados pelo Git. Não coloque a
connection string em comandos, documentação, issues ou mensagens.

## Preparar o Neon

1. Mantenha Managed Better Auth habilitado.
2. Habilite a Neon Data API na branch usada para o ensaio.
3. Prefira criar uma branch vazia chamada `migration-stage-1` para o primeiro
   ensaio.
4. Crie um usuário novo no Managed Better Auth com seu e-mail.
5. No SQL Editor do Neon, confirme o usuário sem copiar senha ou tokens:

```sql
select id, email from neon_auth."user";
```

Copie apenas o `id` do seu usuário para `NEON_USER_ID` no arquivo local.

## Preparar os CSVs

Crie a pasta local `migration-data` e coloque nela:

- `categories.csv`
- `accounts.csv`
- `gastos_fixos.csv`
- `transactions.csv`
- `budgets.csv` (pode estar vazio ou pode ser omitido)

O validador também reconhece automaticamente o padrão gerado pelo exportador
do Supabase: `categories_rows.csv`, `accounts_rows.csv`,
`gastos_fixos_rows.csv`, `transactions_rows.csv` e `budgets_rows.csv`.

Os arquivos originais não são alterados. O importador ignora o `user_id`
antigo durante a escrita e aplica `NEON_USER_ID` a todas as linhas.

## Validar sem alterar o banco

```powershell
npm run migration:validate
```

A validação verifica:

- colunas obrigatórias;
- UUIDs duplicados ou inválidos;
- valores, datas, tipos e dias de vencimento;
- referências entre as cinco tabelas;
- compatibilidade entre o tipo da transação e sua categoria;
- presença de dados de apenas um usuário nos CSVs.

Lançamentos históricos sem conta são preservados, mas geram um aviso. Novos
lançamentos continuam exigindo conta no aplicativo.

## Criar o schema

Após a validação local:

```powershell
npm run migration:schema
```

O script lê a conexão de `.env.migration`, aplica
`neon/migrations/001_initial_schema.sql` e registra a migração. Ele não imprime
a connection string.

Confirme o schema com uma consulta somente leitura:

```powershell
npm run migration:verify
```

## Importar

```powershell
npm run migration:import
```

Antes de inserir, o importador confirma:

- que o schema foi aplicado;
- que `NEON_USER_ID` existe no Managed Better Auth;
- que as tabelas financeiras estão vazias;
- que todos os CSVs passaram na validação.

Toda a importação ocorre dentro de uma transação. Qualquer erro executa
rollback e deixa as tabelas sem importação parcial.

## Conferência

No SQL Editor, compare as quantidades apresentadas pelo importador:

```sql
select 'categories' as tabela, count(*) from public.categories
union all select 'accounts', count(*) from public.accounts
union all select 'gastos_fixos', count(*) from public.gastos_fixos
union all select 'transactions', count(*) from public.transactions
union all select 'budgets', count(*) from public.budgets;
```

Também confira se todos os registros pertencem a um único usuário:

```sql
select count(distinct user_id) as usuarios from (
  select user_id from public.categories
  union all select user_id from public.accounts
  union all select user_id from public.gastos_fixos
  union all select user_id from public.transactions
  union all select user_id from public.budgets
) dados;
```

O resultado esperado é `1` quando houver registros importados.

## Resultado da importação

- `categories`: 12 registros
- `accounts`: 4 registros
- `gastos_fixos`: 3 registros
- `transactions`: 59 registros
- `budgets`: 0 registros

O aplicativo usa o proxy oficial do Managed Better Auth para manter a sessão
em cookie HTTP-only. O cliente da Data API obtém o JWT dessa sessão e o envia
em cada consulta, mantendo as políticas RLS ativas.
