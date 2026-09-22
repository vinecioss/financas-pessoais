begin;

alter table public.categories
  alter column user_id set default ((auth.user_id())::uuid);

alter table public.accounts
  alter column user_id set default ((auth.user_id())::uuid);

alter table public.gastos_fixos
  alter column user_id set default ((auth.user_id())::uuid);

alter table public.transactions
  alter column user_id set default ((auth.user_id())::uuid);

alter table public.budgets
  alter column user_id set default ((auth.user_id())::uuid);

insert into public.app_migrations (version)
values ('002_authenticated_user_defaults')
on conflict (version) do nothing;

commit;
