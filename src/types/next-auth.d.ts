import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    tokenVersion?: number;
  }
  interface Session {
    user: {
      id: string;
      // Not set by the session callback (stays JWT-internal); declared here only so
      // unstable_update({ user: { tokenVersion } }) type-checks in actions.ts.
      tokenVersion?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tokenVersion?: number;
  }
}
