import NextAuth from "next-auth"
import { RedisAdapter } from "@/lib/auth/redis-adapter"
import { userRepository } from "@/lib/repositories/auth-repository"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { loadUserConfig } from "@/lib/infra/config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: RedisAdapter(),
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

        const user: any = await userRepository.findByEmail(email)

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
