-- Caderno — schema, RLS e seed automático de categorias/contas padrão
-- Rode este arquivo inteiro no SQL Editor do Supabase (Database > SQL Editor).
-- É seguro rodar de novo a qualquer momento: os comandos não duplicam nada
-- que já exista (criação de tabelas e colunas é toda condicional).

-- ─────────────────────────────────────────────
-- Tabelas
-- ─────────────────────────────────────────────

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  nome text not null,
  created_at timestamptz default now()
);

-- contas: onde o dinheiro está (vale alimentação, conta corrente/Pix,
-- cartão de crédito, investimentos...), separado do "porquê" (categorias).
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  tipo text not null check (tipo in ('conta', 'cartao', 'investimento')),
  nome text not null,
  saldo_inicial numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  valor numeric(12,2) not null,
  categoria_id uuid references categories not null,
  conta_id uuid references accounts on delete set null,
  data date not null,
  descricao text,
  forma_pagamento text,
  created_at timestamptz default now()
);

-- Caso a tabela já exista de uma versão anterior do schema, garante a coluna nova.
alter table transactions add column if not exists conta_id uuid references accounts on delete set null;

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  categoria_id uuid references categories not null,
  limite_mensal numeric(12,2) not null,
  unique (user_id, categoria_id)
);

create index if not exists transactions_user_data_idx on transactions (user_id, data desc);
create index if not exists transactions_user_conta_idx on transactions (user_id, conta_id);
create index if not exists categories_user_tipo_idx on categories (user_id, tipo);
create index if not exists accounts_user_idx on accounts (user_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

alter table categories enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

create policy "categories_select_own" on categories
  for select using (auth.uid() = user_id);
create policy "categories_insert_own" on categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on categories
  for delete using (auth.uid() = user_id);

create policy "accounts_select_own" on accounts
  for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on accounts
  for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts_delete_own" on accounts
  for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on transactions
  for delete using (auth.uid() = user_id);

create policy "budgets_select_own" on budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on budgets
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Seed automático de categorias e contas padrão para todo novo usuário
-- (dispara quando você cria o usuário manualmente no painel do Supabase)
-- ─────────────────────────────────────────────

create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.categories (user_id, tipo, nome) values
    (new.id, 'receita', 'Salário Fixo'),
    (new.id, 'receita', 'Vale Alimentação'),
    (new.id, 'receita', 'Serviços Extras'),
    (new.id, 'receita', 'Outros'),
    (new.id, 'despesa', 'Moradia'),
    (new.id, 'despesa', 'Alimentação'),
    (new.id, 'despesa', 'Transporte'),
    (new.id, 'despesa', 'Lazer'),
    (new.id, 'despesa', 'Saúde'),
    (new.id, 'despesa', 'Compras'),
    (new.id, 'despesa', 'Outros');

  insert into public.accounts (user_id, tipo, nome) values
    (new.id, 'conta', 'Vale Alimentação'),
    (new.id, 'conta', 'Conta Sicredi'),
    (new.id, 'cartao', 'Cartão Sicredi'),
    (new.id, 'investimento', 'Investimentos Sicredi');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_default_categories();
