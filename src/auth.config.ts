import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [], 
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; 
      } else if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }
      return true;
    },
    
    // 👇 ESTO ES LO NUEVO: Inyectamos la sucursal en el Token y en la Sesión 👇
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        // Capturamos los datos extra si vienen del login
        token.branch_id = (user as any).branch_id;
        token.branch_name = (user as any).branch_name;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).branch_id = token.branch_id;
        (session.user as any).branch_name = token.branch_name;
      }
      return session;
    }
  },
} satisfies NextAuthConfig;