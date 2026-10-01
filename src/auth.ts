import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  // Vercel preview URLs vary per deployment; trust the request host instead of requiring NEXTAUTH_URL.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.toLowerCase().trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        await connectToDatabase();
        const user = await AdminUser.findOne({ email });
        if (!user) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user._id.toString(), email: user.email, tokenVersion: user.tokenVersion ?? 0 };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.tokenVersion = user.tokenVersion ?? 0;
        return token;
      }
      // Server-side unstable_update() call from the password-change action: refresh this
      // device's token so it isn't logged out by the version check below.
      if (trigger === "update") {
        if (typeof session?.user?.tokenVersion === "number") {
          token.tokenVersion = session.user.tokenVersion;
        }
        return token;
      }
      // Re-validate on every request: a changed password bumps tokenVersion in the DB,
      // which invalidates every JWT still carrying the old version (other devices).
      await connectToDatabase();
      const dbUser = await AdminUser.findById(token.id).select("tokenVersion").lean();
      if (!dbUser || (dbUser.tokenVersion ?? 0) !== (token.tokenVersion ?? 0)) {
        return null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      return session;
    },
  },
});
