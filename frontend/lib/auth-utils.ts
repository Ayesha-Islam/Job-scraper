"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
    const { data: session, status } = useSession();

    return {
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        user: session?.user,
    };
}

export function useRequireAuth() {
    const { isAuthenticated, isLoading, user } = useAuth();

    return {
        isAuthenticated,
        isLoading,
        user,
    };
}