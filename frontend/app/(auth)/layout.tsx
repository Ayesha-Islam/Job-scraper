import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Authentication - Remote Job Board",
    description: "Sign in or create an account to save jobs and manage your profile",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}