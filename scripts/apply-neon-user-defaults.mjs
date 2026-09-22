import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import {
  loadMigrationEnv,
  requireMigrationEnv,
} from "./lib/migration-env.mjs";

const { Client } = pg;
const MIGRATION_VERSION = "002_authenticated_user_defaults";

loadMigrationEnv();
const connectionString = requireMigrationEnv("DATABASE_URL");
const client = new Client({ connectionString });

try {
  await client.connect();

  const applied = await client.query(
    "select 1 from public.app_migrations where version = $1",
    [MIGRATION_VERSION]
  );

  if (applied.rowCount) {
    console.log("Os padrões de usuário autenticado já foram aplicados.");
  } else {
    const sqlPath = resolve(
      process.cwd(),
      "neon",
      "migrations",
      "002_authenticated_user_defaults.sql"
    );
    const migrationSql = await readFile(sqlPath, "utf8");
    await client.query(migrationSql);
    console.log("Padrões de usuário autenticado aplicados com sucesso.");
  }
} catch (error) {
  console.error(`Falha ao aplicar os padrões de usuário: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
