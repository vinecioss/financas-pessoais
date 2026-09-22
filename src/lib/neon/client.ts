"use client";

import { createClient as createNeonClient } from "@neondatabase/neon-js";
import { authClient } from "@/lib/neon/auth-client";

const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

if (!dataApiUrl) {
  throw new Error("NEXT_PUBLIC_NEON_DATA_API_URL não foi configurada.");
}

const neon = createNeonClient({
  dataApi: {
    url: dataApiUrl,
    getToken: async () => {
      const { data, error } = await authClient.token();
      if (error) return null;
      return data?.token ?? null;
    },
  },
});

const auth = {
  async signInWithPassword(credentials: { email: string; password: string }) {
    return authClient.signIn.email(credentials);
  },
  async getUser() {
    const { data, error } = await authClient.getSession();
    return {
      data: { user: data?.user ?? null },
      error,
    };
  },
  async signOut() {
    return authClient.signOut();
  },
};

const client = Object.assign(neon, { auth });

export function createClient() {
  return client;
}
