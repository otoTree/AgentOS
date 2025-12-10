import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/infra/prisma"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { loadUserConfig } from "@/lib/infra/config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials || !credentials.email || !credentials.password) {
          return null
        }

        const email = credentials.email as string
        const hash = credentials.password as string

        let user: any = await prisma.user.findUnique({
          where: {
            email,
          },
        })

        if (!user) {
          throw new Error("User not found.")
        }

        const isMatch = bcrypt.compareSync(hash, user.password as string)
        if (!isMatch) {
          throw new Error("Incorrect password.")
        }

        return user
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id
        // Trigger loading user config on login
        // We don't await this to avoid blocking the login flow
        loadUserConfig(user.id).catch(console.error);
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        // Ensure config is loaded for the session (if not already)
        // This handles session refreshes where jwt callback might not run fully
        loadUserConfig(token.id as string).catch(console.error);
      }
      return session
    },
  },
})