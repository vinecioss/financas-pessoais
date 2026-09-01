"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ArrowLeftRight, Tags, Upload } from "lucide-react";

const ITEMS = [
  { href: "/painel", label: "Painel", icon: LayoutGrid },
  { href: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/importar", label: "Importar", icon: Upload },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs"
          >
            <Icon
              size={20}
              strokeWidth={1.75}
              color={active ? "var(--color-green)" : "var(--color-text-secondary)"}
            />
            <span
              style={{
                color: active ? "var(--color-green)" : "var(--color-text-secondary)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
