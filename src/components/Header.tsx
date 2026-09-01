"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-start justify-between bg-[var(--color-green)] px-6 pb-6 pt-8 text-[var(--color-bg)]">
      <div>
        {subtitle && (
          <p className="mb-1 text-sm opacity-70">{subtitle}</p>
        )}
        <h1 className="num-serif text-2xl">{title}</h1>
      </div>
      <button
        onClick={handleLogout}
        aria-label="Sair"
        className="mt-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <LogOut size={20} strokeWidth={1.75} />
      </button>
    </header>
  );
}
