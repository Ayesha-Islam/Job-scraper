"use client";

import { useSession, signOut } from "next-auth/react";

export function useAuth() {
    const { data: session, status } = useSession();

    return {
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        user: session?.user,
        session,
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

export async function logout() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('savedJobs');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');
    }
    
    await signOut({ redirect: false, callbackUrl: '/' });
}