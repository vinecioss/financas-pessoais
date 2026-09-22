import { auth } from "@/lib/neon/server";

export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: [
    "/painel/:path*",
    "/lancamentos/:path*",
    "/contas/:path*",
    "/gastos-fixos/:path*",
    "/categorias/:path*",
    "/importar/:path*",
  ],
};
