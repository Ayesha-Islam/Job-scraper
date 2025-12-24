import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remote Jobs - Job Board",
  description: "Find your dream remote job from top companies worldwide",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}