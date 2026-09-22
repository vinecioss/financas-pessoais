import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import {
  loadMigrationEnv,
  requireMigrationEnv,
} from "./lib/migration-env.mjs";

const { Client } = pg;
const MIGRATION_VERSION = "001_initial_schema";

loadMigrationEnv();
const connectionString = requireMigrationEnv("DATABASE_URL");
const client = new Client({ connectionString });

try {
  await client.connect();

  const tableCheck = await client.query(
    "select to_regclass('public.app_migrations') as migration_table"
  );

  if (tableCheck.rows[0]?.migration_table) {
    const applied = await client.query(
      "select 1 from public.app_migrations where version = $1",
      [MIGRATION_VERSION]
    );
    if (applied.rowCount) {
      console.log("O schema inicial do Caderno já foi aplicado neste banco.");
      process.exitCode = 0;
    } else {
      throw new Error(
        "A tabela app_migrations já existe, mas a migração inicial não está registrada. Revise o banco antes de continuar."
      );
    }
  } else {
    const sqlPath = resolve(
      process.cwd(),
      "neon",
      "migrations",
      "001_initial_schema.sql"
    );
    const migrationSql = await readFile(sqlPath, "utf8");
    await client.query(migrationSql);
    console.log("Schema inicial aplicado no Neon com sucesso.");
  }
} catch (error) {
  console.error(`Falha ao aplicar o schema: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
