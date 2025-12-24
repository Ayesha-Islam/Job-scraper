import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginUser } from "./api"; 

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('❌ Missing credentials');
          throw new Error("Invalid credentials");
        }

        try {
          console.log('🔐 Attempting login for:', credentials.email);
          
          const response = await loginUser(
            credentials.email,
            credentials.password
          );

          console.log('✅ Login response:', response);

          if (!response.success || !response.data) {
            console.error('❌ Login failed:', response);
            throw new Error("Authentication failed");
          }

          return {
            id: response.data.id,
            email: response.data.email,
            name: response.data.name,
          };

        } catch (error) {
          console.error("❌ Auth error:", error);
          throw new Error(error instanceof Error ? error.message : "Invalid email or password");
        }
      }
    })
  ],
  
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        console.log('✅ JWT token created for:', user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    }
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

