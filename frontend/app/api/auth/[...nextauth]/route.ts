import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const { handlers } = NextAuth(authOptions as any) as any;

export const GET = handlers.GET;
export const POST = handlers.POST;