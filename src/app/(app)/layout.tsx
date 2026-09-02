import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-1">
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-4">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
