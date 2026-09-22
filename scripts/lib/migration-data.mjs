import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const FILES = {
  categories: {
    files: ["categories.csv", "categories_rows.csv"],
    required: ["id", "user_id", "tipo", "nome"],
  },
  accounts: {
    files: ["accounts.csv", "accounts_rows.csv"],
    required: ["id", "user_id", "tipo", "nome", "saldo_inicial"],
  },
  gastosFixos: {
    files: ["gastos_fixos.csv", "gastos_fixos_rows.csv"],
    required: ["id", "user_id", "tipo", "nome", "valor", "categoria_id"],
  },
  transactions: {
    files: ["transactions.csv", "transactions_rows.csv"],
    required: [
      "id",
      "user_id",
      "tipo",
      "valor",
      "categoria_id",
      "data",
    ],
  },
  budgets: {
    files: ["budgets.csv", "budgets_rows.csv"],
    required: ["id", "user_id", "categoria_id", "limite_mensal"],
    optional: true,
  },
};

function clean(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function numberValue(value) {
  const normalized = clean(value);
  if (normalized === null) return null;
  const candidate = normalized.includes(",") && !normalized.includes(".")
    ? normalized.replace(",", ".")
    : normalized;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerValue(value) {
  const parsed = numberValue(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function readCsv(directory, config, errors) {
  const selectedFile = config.files.find((file) =>
    existsSync(resolve(directory, file))
  );
  const displayFile = selectedFile ?? config.files[0];
  if (!selectedFile) {
    if (config.optional) return { headers: [], rows: [] };
    errors.push(`${config.files.join(" ou ")}: arquivo não encontrado.`);
    return { headers: [], rows: [] };
  }

  const filePath = resolve(directory, selectedFile);

  const source = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  if (!source.trim()) return { headers: [], rows: [] };

  const parsed = Papa.parse(source, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
  });

  for (const issue of parsed.errors) {
    errors.push(`${displayFile}: CSV inválido na linha ${issue.row + 2}.`);
  }

  const headers = parsed.meta.fields ?? [];
  if (parsed.data.length > 0) {
    for (const column of config.required) {
      if (!headers.includes(column)) {
        errors.push(`${displayFile}: coluna obrigatória "${column}" ausente.`);
      }
    }
  }

  return { headers, rows: parsed.data, file: displayFile };
}

function rowLabel(file, index) {
  return `${file}, linha ${index + 2}`;
}

function validateUuid(value, label, field, errors, { nullable = false } = {}) {
  const normalized = clean(value);
  if (normalized === null && nullable) return null;
  if (normalized === null || !UUID_RE.test(normalized)) {
    errors.push(`${label}: ${field} não é um UUID válido.`);
    return normalized;
  }
  return normalized;
}

function validateTipo(value, label, errors, allowed) {
  const normalized = clean(value);
  if (!allowed.includes(normalized)) {
    errors.push(`${label}: tipo inválido.`);
  }
  return normalized;
}

function validatePositive(value, label, field, errors) {
  const parsed = numberValue(value);
  if (parsed === null || parsed <= 0) {
    errors.push(`${label}: ${field} deve ser maior que zero.`);
  }
  return parsed;
}

function validateDay(value, label, field, errors) {
  const normalized = clean(value);
  if (normalized === null) return null;
  const parsed = integerValue(normalized);
  if (parsed === null || parsed < 1 || parsed > 31) {
    errors.push(`${label}: ${field} deve estar entre 1 e 31.`);
  }
  return parsed;
}

function validateTimestamp(value, label, errors) {
  const normalized = clean(value);
  if (normalized === null) return null;
  if (Number.isNaN(Date.parse(normalized))) {
    errors.push(`${label}: created_at inválido.`);
  }
  return normalized;
}

function ensureUnique(rows, file, errors) {
  const seen = new Set();
  rows.forEach((row, index) => {
    if (!row.id) return;
    if (seen.has(row.id)) {
      errors.push(`${rowLabel(file, index)}: id duplicado.`);
    }
    seen.add(row.id);
  });
}

export function loadAndValidateMigrationData() {
  const directory = resolve(
    process.cwd(),
    process.env.MIGRATION_CSV_DIR?.trim() || "migration-data"
  );
  const errors = [];
  const warnings = [];
  const raw = {};

  for (const [key, config] of Object.entries(FILES)) {
    raw[key] = readCsv(directory, config, errors);
  }

  const oldUserIds = new Set();
  for (const table of Object.values(raw)) {
    for (const row of table.rows) {
      const userId = clean(row.user_id);
      if (userId) oldUserIds.add(userId);
    }
  }
  if (oldUserIds.size === 0) {
    errors.push("Nenhum user_id foi encontrado nos CSVs.");
  } else if (oldUserIds.size > 1) {
    errors.push("Os CSVs contêm dados de mais de um usuário.");
  }

  const categories = raw.categories.rows.map((row, index) => {
    const label = rowLabel(raw.categories.file, index);
    const id = validateUuid(row.id, label, "id", errors);
    const tipo = validateTipo(row.tipo, label, errors, ["receita", "despesa"]);
    const nome = clean(row.nome);
    if (!nome) errors.push(`${label}: nome vazio.`);
    return {
      id,
      tipo,
      nome,
      created_at: validateTimestamp(row.created_at, label, errors),
    };
  });

  const accounts = raw.accounts.rows.map((row, index) => {
    const label = rowLabel(raw.accounts.file, index);
    const saldoInicial = numberValue(row.saldo_inicial);
    if (saldoInicial === null) errors.push(`${label}: saldo_inicial inválido.`);
    const nome = clean(row.nome);
    if (!nome) errors.push(`${label}: nome vazio.`);
    return {
      id: validateUuid(row.id, label, "id", errors),
      tipo: validateTipo(row.tipo, label, errors, [
        "conta",
        "cartao",
        "investimento",
      ]),
      nome,
      saldo_inicial: saldoInicial,
      dia_fechamento: validateDay(row.dia_fechamento, label, "dia_fechamento", errors),
      dia_vencimento: validateDay(row.dia_vencimento, label, "dia_vencimento", errors),
      created_at: validateTimestamp(row.created_at, label, errors),
    };
  });

  const gastosFixos = raw.gastosFixos.rows.map((row, index) => {
    const label = rowLabel(raw.gastosFixos.file, index);
    const nome = clean(row.nome);
    if (!nome) errors.push(`${label}: nome vazio.`);
    return {
      id: validateUuid(row.id, label, "id", errors),
      tipo: validateTipo(row.tipo, label, errors, ["receita", "despesa"]),
      nome,
      valor: validatePositive(row.valor, label, "valor", errors),
      categoria_id: validateUuid(row.categoria_id, label, "categoria_id", errors),
      conta_id: validateUuid(row.conta_id, label, "conta_id", errors, { nullable: true }),
      dia_vencimento: validateDay(row.dia_vencimento, label, "dia_vencimento", errors),
      created_at: validateTimestamp(row.created_at, label, errors),
    };
  });

  const transactions = raw.transactions.rows.map((row, index) => {
    const label = rowLabel(raw.transactions.file, index);
    const data = clean(row.data);
    if (!data || !DATE_RE.test(data) || Number.isNaN(Date.parse(`${data}T00:00:00Z`))) {
      errors.push(`${label}: data inválida.`);
    }
    const contaId = validateUuid(row.conta_id, label, "conta_id", errors, {
      nullable: true,
    });
    if (!contaId) {
      warnings.push(`${label}: lançamento histórico sem conta; será preservado assim.`);
    }
    return {
      id: validateUuid(row.id, label, "id", errors),
      tipo: validateTipo(row.tipo, label, errors, ["receita", "despesa"]),
      valor: validatePositive(row.valor, label, "valor", errors),
      categoria_id: validateUuid(row.categoria_id, label, "categoria_id", errors),
      conta_id: contaId,
      gasto_fixo_id: validateUuid(row.gasto_fixo_id, label, "gasto_fixo_id", errors, {
        nullable: true,
      }),
      data,
      descricao: clean(row.descricao),
      created_at: validateTimestamp(row.created_at, label, errors),
    };
  });

  const budgets = raw.budgets.rows.map((row, index) => {
    const label = rowLabel(raw.budgets.file ?? FILES.budgets.files[0], index);
    return {
      id: validateUuid(row.id, label, "id", errors),
      categoria_id: validateUuid(row.categoria_id, label, "categoria_id", errors),
      limite_mensal: validatePositive(row.limite_mensal, label, "limite_mensal", errors),
    };
  });

  ensureUnique(categories, raw.categories.file, errors);
  ensureUnique(accounts, raw.accounts.file, errors);
  ensureUnique(gastosFixos, raw.gastosFixos.file, errors);
  ensureUnique(transactions, raw.transactions.file, errors);
  ensureUnique(budgets, raw.budgets.file ?? FILES.budgets.files[0], errors);

  const categoryById = new Map(categories.map((row) => [row.id, row]));
  const accountIds = new Set(accounts.map((row) => row.id));
  const gastoFixoById = new Map(gastosFixos.map((row) => [row.id, row]));

  gastosFixos.forEach((row, index) => {
    const label = rowLabel(raw.gastosFixos.file, index);
    const category = categoryById.get(row.categoria_id);
    if (!category) errors.push(`${label}: categoria_id não existe em categories.csv.`);
    else if (category.tipo !== row.tipo) {
      errors.push(`${label}: o tipo não corresponde ao tipo da categoria.`);
    }
    if (row.conta_id && !accountIds.has(row.conta_id)) {
      errors.push(`${label}: conta_id não existe em accounts.csv.`);
    }
  });

  transactions.forEach((row, index) => {
    const label = rowLabel(raw.transactions.file, index);
    const category = categoryById.get(row.categoria_id);
    if (!category) errors.push(`${label}: categoria_id não existe em categories.csv.`);
    else if (category.tipo !== row.tipo) {
      errors.push(`${label}: o tipo não corresponde ao tipo da categoria.`);
    }
    if (row.conta_id && !accountIds.has(row.conta_id)) {
      errors.push(`${label}: conta_id não existe em accounts.csv.`);
    }
    if (row.gasto_fixo_id) {
      const gastoFixo = gastoFixoById.get(row.gasto_fixo_id);
      if (!gastoFixo) {
        errors.push(`${label}: gasto_fixo_id não existe em gastos_fixos.csv.`);
      } else if (gastoFixo.tipo !== row.tipo) {
        errors.push(`${label}: o tipo não corresponde ao lançamento fixo vinculado.`);
      }
    }
  });

  const budgetCategoryIds = new Set();
  budgets.forEach((row, index) => {
    const label = rowLabel(raw.budgets.file ?? FILES.budgets.files[0], index);
    if (!categoryById.has(row.categoria_id)) {
      errors.push(`${label}: categoria_id não existe em categories.csv.`);
    }
    if (budgetCategoryIds.has(row.categoria_id)) {
      errors.push(`${label}: orçamento duplicado para a mesma categoria.`);
    }
    budgetCategoryIds.add(row.categoria_id);
  });

  return {
    directory,
    data: { categories, accounts, gastosFixos, transactions, budgets },
    errors,
    warnings,
    counts: {
      categories: categories.length,
      accounts: accounts.length,
      gastos_fixos: gastosFixos.length,
      transactions: transactions.length,
      budgets: budgets.length,
    },
  };
}

export function printValidationSummary(result) {
  console.log("Validação dos CSVs:");
  for (const [table, count] of Object.entries(result.counts)) {
    console.log(`- ${table}: ${count} registro(s)`);
  }

  if (result.warnings.length > 0) {
    console.log("\nAvisos:");
    for (const warning of result.warnings) console.log(`- ${warning}`);
  }

  if (result.errors.length > 0) {
    console.error("\nErros:");
    for (const error of result.errors) console.error(`- ${error}`);
  }
}
