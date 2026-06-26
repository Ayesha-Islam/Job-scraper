"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoutes({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status } = useSession();
    const route = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            route.push("/login");
        }
    }, [status, route]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="mt-4 text-lg text-muted-foreground">
                        Loading...
                    </p>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return null;
    }

    return <>{children}</>;
}