import pg from "pg";
import {
  loadMigrationEnv,
  requireMigrationEnv,
} from "./lib/migration-env.mjs";

const { Client } = pg;
const TABLES = [
  "categories",
  "accounts",
  "gastos_fixos",
  "transactions",
  "budgets",
];

loadMigrationEnv();
const client = new Client({
  connectionString: requireMigrationEnv("DATABASE_URL"),
});

try {
  await client.connect();

  const migrations = await client.query(
    `select version from public.app_migrations
     where version = any($1::text[])`,
    [["001_initial_schema", "002_authenticated_user_defaults"]]
  );
  if (migrations.rowCount !== 2) {
    throw new Error("Uma ou mais migrações obrigatórias não estão registradas.");
  }

  const userDefaults = await client.query(
    `select table_name, column_default
     from information_schema.columns
     where table_schema = 'public'
       and table_name = any($1::text[])
       and column_name = 'user_id'`,
    [TABLES]
  );

  const missingUserDefaults = userDefaults.rows.filter(
    (row) => !row.column_default?.includes("auth.user_id()")
  );
  if (
    userDefaults.rowCount !== TABLES.length ||
    missingUserDefaults.length > 0
  ) {
    throw new Error("Uma ou mais tabelas não preenchem o usuário autenticado.");
  }

  const security = await client.query(
    `select c.relname as table_name, c.relrowsecurity as rls_enabled,
       count(p.policyname)::int as policies
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     left join pg_policies p
       on p.schemaname = n.nspname and p.tablename = c.relname
     where n.nspname = 'public' and c.relname = any($1::text[])
     group by c.relname, c.relrowsecurity
     order by c.relname`,
    [TABLES]
  );

  const relations = await client.query(
    `select count(*)::int as relation_count
     from pg_constraint c
     join pg_class rel on rel.oid = c.conrelid
     join pg_namespace n on n.oid = rel.relnamespace
     where n.nspname = 'public'
       and c.contype = 'f'
       and rel.relname = any($1::text[])`,
    [TABLES]
  );

  const counts = {};
  for (const table of TABLES) {
    const result = await client.query(`select count(*)::int as count from public.${table}`);
    counts[table] = result.rows[0].count;
  }

  const missingSecurity = security.rows.filter(
    (row) => !row.rls_enabled || row.policies < 1
  );
  if (security.rowCount !== TABLES.length || missingSecurity.length > 0) {
    throw new Error("Uma ou mais tabelas não têm RLS e política configurados.");
  }

  if (relations.rows[0].relation_count !== 11) {
    throw new Error("As relações esperadas entre as tabelas não foram encontradas.");
  }

  console.log("Schema Neon verificado:");
  for (const table of TABLES) {
    console.log(
      `- ${table}: RLS ativo, usuário automático, ${counts[table]} registro(s)`
    );
  }
  console.log(`- relações por chave estrangeira: ${relations.rows[0].relation_count}`);
} catch (error) {
  console.error(`Falha na verificação do schema: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
