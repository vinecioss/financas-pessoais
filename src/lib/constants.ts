import type { FormaPagamento } from "@/types/database";

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  "Pix",
  "Dinheiro",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Vale Alimentação",
  "Transferência",
  "Boleto",
];

export const CATEGORIAS_PADRAO_RECEITA = [
  "Salário Fixo",
  "Vale Alimentação",
  "Serviços Extras",
  "Outros",
];

export const CATEGORIAS_PADRAO_DESPESA = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Lazer",
  "Saúde",
  "Compras",
  "Outros",
];

// Palette used for the donut chart segments (cycled if there are more categories).
export const CHART_COLORS = [
  "#9C4A3C",
  "#C9A227",
  "#1B3A34",
  "#63675F",
  "#2F6F4E",
  "#B07A3E",
  "#5B7A8C",
  "#7A5C7E",
];

export const CHART_COLORS_DARK = [
  "#D9805F",
  "#D9B54E",
  "#3E8E78",
  "#999B8C",
  "#4FAD84",
  "#C79A5F",
  "#7C9BB0",
  "#9C7FA3",
];
