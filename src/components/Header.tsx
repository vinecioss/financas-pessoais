"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-[var(--color-green)] px-6 pb-6 pt-8 text-[var(--color-bg)] lg:px-10 lg:pb-8 lg:pt-10">
      <div className="mx-auto flex max-w-3xl items-start justify-between">
        <div>
          {subtitle && (
            <p className="mb-1 text-sm opacity-70">{subtitle}</p>
          )}
          <h1 className="num-serif text-2xl lg:text-3xl">{title}</h1>
        </div>
        <div className="mt-1 flex items-center gap-4 lg:hidden">
          <ThemeToggle className="opacity-70 transition-opacity hover:opacity-100" />
          <button
            onClick={handleLogout}
            aria-label="Sair"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <LogOut size={20} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
