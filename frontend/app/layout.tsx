import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";


const inter = Inter({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Remote Job Board - Find Your Dream Remote Job",
  description: "Discover remote job opportunities from top companies. Updated daily with the latest positions.",
  keywords: ["remote jobs", "work from home", "remote work", "job board"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={inter.className}
      >
        <SessionProvider>
          <Navbar />
          <main>
            {children}
          </main>
          <Footer/>
        </SessionProvider>
      </body>
    </html>
  );
}
