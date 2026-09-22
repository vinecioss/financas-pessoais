import { auth } from "@/lib/neon/server";

export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
