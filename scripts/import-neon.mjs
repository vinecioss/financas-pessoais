import pg from "pg";
import {
  loadMigrationEnv,
  requireMigrationEnv,
} from "./lib/migration-env.mjs";
import {
  loadAndValidateMigrationData,
  printValidationSummary,
} from "./lib/migration-data.mjs";

const { Client } = pg;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

loadMigrationEnv();
const connectionString = requireMigrationEnv("DATABASE_URL");
const neonUserId = requireMigrationEnv("NEON_USER_ID");
if (!UUID_RE.test(neonUserId)) {
  throw new Error("NEON_USER_ID não é um UUID válido.");
}
const result = loadAndValidateMigrationData();

printValidationSummary(result);
if (result.errors.length > 0) {
  console.error("\nImportação cancelada. Corrija os CSVs e valide novamente.");
  process.exit(1);
}

const client = new Client({ connectionString });

async function insertCategories(rows) {
  for (const row of rows) {
    await client.query(
      `insert into public.categories
        (id, user_id, tipo, nome, created_at)
       values ($1, $2, $3, $4, coalesce($5::timestamptz, now()))`,
      [row.id, neonUserId, row.tipo, row.nome, row.created_at]
    );
  }
}

async function insertAccounts(rows) {
  for (const row of rows) {
    await client.query(
      `insert into public.accounts
        (id, user_id, tipo, nome, saldo_inicial, dia_fechamento,
         dia_vencimento, created_at)
       values ($1, $2, $3, $4, $5, $6, $7,
         coalesce($8::timestamptz, now()))`,
      [
        row.id,
        neonUserId,
        row.tipo,
        row.nome,
        row.saldo_inicial,
        row.dia_fechamento,
        row.dia_vencimento,
        row.created_at,
      ]
    );
  }
}

async function insertGastosFixos(rows) {
  for (const row of rows) {
    await client.query(
      `insert into public.gastos_fixos
        (id, user_id, tipo, nome, valor, categoria_id, conta_id,
         dia_vencimento, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8,
         coalesce($9::timestamptz, now()))`,
      [
        row.id,
        neonUserId,
        row.tipo,
        row.nome,
        row.valor,
        row.categoria_id,
        row.conta_id,
        row.dia_vencimento,
        row.created_at,
      ]
    );
  }
}

async function insertTransactions(rows) {
  for (const row of rows) {
    await client.query(
      `insert into public.transactions
        (id, user_id, tipo, valor, categoria_id, conta_id,
         gasto_fixo_id, data, descricao, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9,
         coalesce($10::timestamptz, now()))`,
      [
        row.id,
        neonUserId,
        row.tipo,
        row.valor,
        row.categoria_id,
        row.conta_id,
        row.gasto_fixo_id,
        row.data,
        row.descricao,
        row.created_at,
      ]
    );
  }
}

async function insertBudgets(rows) {
  for (const row of rows) {
    await client.query(
      `insert into public.budgets
        (id, user_id, categoria_id, limite_mensal)
       values ($1, $2, $3, $4)`,
      [row.id, neonUserId, row.categoria_id, row.limite_mensal]
    );
  }
}

try {
  await client.connect();

  const migrationCheck = await client.query(
    "select 1 from public.app_migrations where version = '001_initial_schema'"
  );
  if (!migrationCheck.rowCount) {
    throw new Error("A migração 001_initial_schema ainda não foi aplicada.");
  }

  const userCheck = await client.query(
    'select 1 from neon_auth."user" where id = $1',
    [neonUserId]
  );
  if (!userCheck.rowCount) {
    throw new Error("NEON_USER_ID não corresponde a um usuário do Managed Better Auth.");
  }

  const occupancy = await client.query(`
    select
      (select count(*) from public.categories) as categories,
      (select count(*) from public.accounts) as accounts,
      (select count(*) from public.gastos_fixos) as gastos_fixos,
      (select count(*) from public.transactions) as transactions,
      (select count(*) from public.budgets) as budgets
  `);
  const occupied = Object.entries(occupancy.rows[0]).filter(
    ([, count]) => Number(count) > 0
  );
  if (occupied.length > 0) {
    throw new Error(
      "As tabelas financeiras do Neon não estão vazias. A importação foi cancelada para evitar duplicação ou sobrescrita."
    );
  }

  await client.query("begin");
  await insertCategories(result.data.categories);
  await insertAccounts(result.data.accounts);
  await insertGastosFixos(result.data.gastosFixos);
  await insertTransactions(result.data.transactions);
  await insertBudgets(result.data.budgets);
  await client.query("commit");

  console.log("\nImportação concluída em uma única transação.");
  for (const [table, count] of Object.entries(result.counts)) {
    console.log(`- ${table}: ${count} registro(s)`);
  }
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error(`\nImportação cancelada: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
