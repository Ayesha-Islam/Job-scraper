import { compare, hash } from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

interface User {
    id: string;
    name: string;
    email: string;
    password: string;
}

const users: User[] = [];

const authorize = async (credentials: Record<"email" | "password", string> | undefined) => {
    if (!credentials) {
        throw new Error("Credentials are required");
    }

    if (!credentials.email || !credentials.password) {
        throw new Error("Email and password are required");
    }

    const user = users.find(u => u.email === credentials.email);

    if (!user) {
        throw new Error("No user found with the given email");
    }

    const isPasswordValid = await compare(
        credentials.password,
        user.password
    );

    if (!isPasswordValid) {
        throw new Error("Invalid password");
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email
    };
};

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            authorize
        })
    ],

    pages: {
        signIn: '/login',
        signOut: '/',
        error: '/login'
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).name = token.name as string;
                (session.user as any).email = token.email as string;
            }
            return session;
        }
    },

    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
}

export async function createUser(email: string, name: string, password: string) {
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await hash(password, 10);

    const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        password: hashedPassword
    };

    users.push(newUser);

    return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
    };
}