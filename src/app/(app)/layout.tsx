import { redirect } from "next/navigation";
import { auth } from "@/lib/neon/server";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
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
