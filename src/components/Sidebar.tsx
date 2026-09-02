"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, ArrowLeftRight, Wallet, Tags, Upload, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const ITEMS = [
  { href: "/painel", label: "Painel", icon: LayoutGrid },
  { href: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/contas", label: "Contas", icon: Wallet },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/importar", label: "Importar", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex">
      <div className="px-6 pb-6 pt-8">
        <p className="mb-1 text-sm text-[var(--color-text-secondary)]">
          Controle financeiro
        </p>
        <h1 className="num-serif text-2xl text-[var(--color-green)]">Caderno</h1>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
              style={{
                background: active ? "var(--color-surface-alt)" : "transparent",
                color: active ? "var(--color-green)" : "var(--color-text-secondary)",
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-6 flex flex-col gap-1">
        <ThemeToggle
          withLabel
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
        />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Sair
        </button>
      </div>
    </aside>
  );
}
