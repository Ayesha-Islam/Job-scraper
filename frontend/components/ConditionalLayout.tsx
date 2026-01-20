"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const isLandingPage = pathname === "/";
  
const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  return (
    <>
      {!isLandingPage && !isAuthPage && <Navbar />}
      <main>{children}</main>
      {!isLandingPage && !isAuthPage && <Footer />}
    </>
  );
}