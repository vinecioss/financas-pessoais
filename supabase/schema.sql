-- Caderno — schema, RLS e seed automático de categorias padrão
-- Rode este arquivo inteiro no SQL Editor do Supabase (Database > SQL Editor).

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

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  valor numeric(12,2) not null,
  categoria_id uuid references categories not null,
  data date not null,
  descricao text,
  forma_pagamento text,
  created_at timestamptz default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  categoria_id uuid references categories not null,
  limite_mensal numeric(12,2) not null,
  unique (user_id, categoria_id)
);

create index if not exists transactions_user_data_idx on transactions (user_id, data desc);
create index if not exists categories_user_tipo_idx on categories (user_id, tipo);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

alter table categories enable row level security;
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
-- Seed automático de categorias padrão para todo novo usuário
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_default_categories();
