import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        return { id: user._id.toString(), email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
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
