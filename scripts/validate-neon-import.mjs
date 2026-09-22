import { loadMigrationEnv } from "./lib/migration-env.mjs";
import {
  loadAndValidateMigrationData,
  printValidationSummary,
} from "./lib/migration-data.mjs";

loadMigrationEnv();

const result = loadAndValidateMigrationData();
printValidationSummary(result);

if (result.errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log("\nValidação concluída. Nenhum dado foi alterado.");
}
