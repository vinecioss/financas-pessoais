import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadMigrationEnv() {
  const envPath = resolve(process.cwd(), ".env.migration");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

export function requireMigrationEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Variável ${name} ausente. Preencha o arquivo .env.migration local.`
    );
  }
  return value;
}
