import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db, users, teamService } from "@agentos/service";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Root Admin",
      credentials: {
        username: { label: "Username/Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const identifier = credentials.username;

        // Try to find user by email OR name
        const [user] = await db
          .select()
          .from(users)
          .where(
             or(
                 eq(users.email, identifier),
                 eq(users.name, identifier)
             )
          )
          .limit(1);

        if (!user || !user.password) {
          throw new Error("User not found");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        // ONLY allow Root user to log in to this admin panel
        const isRoot = await teamService.isRoot(user.id);
        if (!isRoot) {
            throw new Error("Forbidden: Only Root account can access the Super Admin Panel");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: `next-auth.admin-session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
};

export default NextAuth(authOptions);
