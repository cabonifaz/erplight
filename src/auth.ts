import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const [result]: any = await pool.query(
            "CALL sp_buscar_usuario_login(?)",
            [credentials.email]
          );

          const user = result[0]?.[0];
          if (!user) return null;

          // 🚨 EL CHISMOSO: Mira en tu terminal qué devuelve realmente la BD
          console.log("DATOS REALES QUE TRAE LA BD:", user);

          const passwordsMatch = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (passwordsMatch) {
            const sucursalDetectada = user.branch_name || user.sucursal || user.nombre_sucursal || "Sin Sucursal";
            const rolDetectado = user.role || user.code || user.rol || "SIN_ROL";

            return {
              id: user.id.toString(),
              name: user.name,
              email: user.email,
              role: rolDetectado, 
              branch_name: sucursalDetectada, 
            };
          }
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }: any) {
      // 1. Cuando el usuario se loguea, pasamos el rol al Token
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.branch_name = user.branch_name;
        console.log("🟢 [PASO 1: JWT] Token guardó el rol:", token.role);
      }
      return token;
    },
    async session({ session, token }: any) {
      // 2. Pasamos el rol del Token a la Sesión (para que tu recuadro negro lo lea)
      if (session.user && token) {
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.id = token.id;
        // @ts-ignore
        session.user.branch_name = token.branch_name;
        console.log("🔵 [PASO 2: SESIÓN] Sesión enviada al navegador con rol:", session.user.role);
      }
      return session;
    },
  },
});