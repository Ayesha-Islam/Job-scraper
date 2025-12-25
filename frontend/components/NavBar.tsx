"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
  User,
  LogOut,
  Bookmark,
  Settings,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  if (!mounted) {
    return (
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-primary">
              JobScraper
            </Link>
            <div className="w-32 h-9 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-primary">
            JobScraper
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/jobs">
              <Button variant="ghost" size="sm">
                Find Jobs
              </Button>
            </Link>

            {status === "loading" ? (
              <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <Avatar className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border hover:opacity-80 transition">
                    <AvatarImage
                      src={session.user?.image || ""}
                      className="aspect-square h-full w-full" />
                    <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {session.user?.name?.[0] || "U"}
                    </AvatarFallback>

                  </Avatar>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-72 p-0 py-2 shadow-xl border-slate-200"
                >
                  <div className="flex px-4 py-3 gap-4">
                    <Avatar className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border hover:opacity-80 transition">
                      <AvatarImage
                        src={session.user?.image || ""}
                        className="aspect-square h-full w-full" />
                      <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {session.user?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-[16px] font-medium leading-tight">
                        {session.user?.name}
                      </span>
                      <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                        {session.user?.email}
                      </span>
                      <Link
                        href="/profile"
                        className="text-blue-600 text-sm mt-2 hover:underline inline-block"
                      >
                        View your profile
                      </Link>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup className="py-1">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/saved-jobs"
                        className="flex items-center gap-4 px-4 py-3 cursor-pointer focus:bg-accent"
                      >
                        <Bookmark className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[15px]">Saved Jobs</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className="flex items-center justify-between px-4 py-3 cursor-pointer focus:bg-accent"
                      >
                        <div className="flex items-center gap-4">
                          <Settings className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[15px]">Settings</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="text-[15px] font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}