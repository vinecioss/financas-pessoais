begin;

do $$
begin
  if to_regclass('neon_auth."user"') is null then
    raise exception 'Managed Better Auth não está provisionado neste banco.';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise exception 'O papel authenticated não existe. Habilite a Neon Data API antes de aplicar o schema.';
  end if;
end
$$;

create table if not exists public.app_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user" (id) on delete cascade,
  tipo text not null check (tipo in ('receita', 'despesa')),
  nome text not null check (btrim(nome) <> ''),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, tipo)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user" (id) on delete cascade,
  tipo text not null check (tipo in ('conta', 'cartao', 'investimento')),
  nome text not null check (btrim(nome) <> ''),
  saldo_inicial numeric(12, 2) not null default 0,
  dia_fechamento smallint check (dia_fechamento between 1 and 31),
  dia_vencimento smallint check (dia_vencimento between 1 and 31),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.gastos_fixos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user" (id) on delete cascade,
  tipo text not null default 'despesa' check (tipo in ('receita', 'despesa')),
  nome text not null check (btrim(nome) <> ''),
  valor numeric(12, 2) not null check (valor > 0),
  categoria_id uuid not null,
  conta_id uuid,
  dia_vencimento smallint check (dia_vencimento between 1 and 31),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, tipo),
  constraint gastos_fixos_categoria_owner_fk
    foreign key (categoria_id, user_id, tipo)
    references public.categories (id, user_id, tipo),
  constraint gastos_fixos_conta_owner_fk
    foreign key (conta_id, user_id)
    references public.accounts (id, user_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user" (id) on delete cascade,
  tipo text not null check (tipo in ('receita', 'despesa')),
  valor numeric(12, 2) not null check (valor > 0),
  categoria_id uuid not null,
  conta_id uuid,
  gasto_fixo_id uuid,
  data date not null,
  descricao text,
  created_at timestamptz not null default now(),
  constraint transactions_categoria_owner_fk
    foreign key (categoria_id, user_id, tipo)
    references public.categories (id, user_id, tipo),
  constraint transactions_conta_owner_fk
    foreign key (conta_id, user_id)
    references public.accounts (id, user_id),
  constraint transactions_gasto_fixo_owner_fk
    foreign key (gasto_fixo_id, user_id, tipo)
    references public.gastos_fixos (id, user_id, tipo)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user" (id) on delete cascade,
  categoria_id uuid not null,
  limite_mensal numeric(12, 2) not null check (limite_mensal > 0),
  unique (user_id, categoria_id),
  constraint budgets_categoria_owner_fk
    foreign key (categoria_id, user_id)
    references public.categories (id, user_id)
);

create index categories_user_tipo_idx on public.categories (user_id, tipo);
create index accounts_user_idx on public.accounts (user_id);
create index gastos_fixos_user_idx on public.gastos_fixos (user_id);
create index transactions_user_data_idx on public.transactions (user_id, data desc);
create index transactions_user_conta_idx on public.transactions (user_id, conta_id);
create index transactions_user_gasto_fixo_idx on public.transactions (user_id, gasto_fixo_id);

alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.gastos_fixos enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy categories_own_rows on public.categories
  for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);

create policy accounts_own_rows on public.accounts
  for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);

create policy gastos_fixos_own_rows on public.gastos_fixos
  for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);

create policy transactions_own_rows on public.transactions
  for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);

create policy budgets_own_rows on public.budgets
  for all to authenticated
  using ((select auth.user_id())::uuid = user_id)
  with check ((select auth.user_id())::uuid = user_id);

revoke all on public.app_migrations, public.categories, public.accounts,
  public.gastos_fixos, public.transactions, public.budgets from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anonymous') then
    execute 'revoke all on public.app_migrations, public.categories, '
      || 'public.accounts, public.gastos_fixos, public.transactions, '
      || 'public.budgets from anonymous';
  end if;
end
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.categories, public.accounts,
  public.gastos_fixos, public.transactions, public.budgets to authenticated;

insert into public.app_migrations (version)
values ('001_initial_schema');

commit;
