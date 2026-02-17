"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Bookmark,
  Settings,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface NavbarProps {
  showFilterButton?: boolean;
  onFilterClick?: () => void;
  activeFilterCount?: number;
}

export default function Navbar({
  showFilterButton = false,
  onFilterClick,
  activeFilterCount = 0,
}: NavbarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  if (!mounted) return <div className="h-20 bg-transparent" />;

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <nav className="fixed bg-[#0B1421] top-0 left-0 w-full z-50 backdrop-blur-md shadow-sm py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-bold text-white text-xl tracking-tight hidden sm:block">
            JobScraper
          </span>
        </Link>

        <div className="hidden lg:block">
          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                    )}
                  >
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink>
                  <Link href="/stats"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                    )}

                  >
                    Services
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/portfolio"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                    )}
                  >
                    Portfolio
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-4">

          {showFilterButton && onFilterClick && (
            <Button
              variant="outline"
              size="icon"
              onClick={onFilterClick}
              className="relative border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-white">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}

          {status === "loading" ? (
            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
          ) : session ? (

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 rounded-full ring-2 ring-white/20 hover:ring-white/50 transition-all duration-200 focus:outline-none">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback className="bg-[#15202B] text-white text-sm font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-60 p-0 overflow-hidden rounded-2xl border border-white/10 bg-[#FFFFFF] shadow-2xl"
              >
                {/* user header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback className="bg-[#15202B] text-white text-sm font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black truncate">
                      {session.user?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {session.user?.email}
                    </p>
                  </div>
                </div>

                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2.5 mx-1 px-3 py-2 text-sm text-black rounded-lg cursor-pointer hover:bg-gray-100 hover:text-black focus:bg-gray-200 focus:text-black transition-colors"
                    >
                      <User className="h-4 w-4 text-gray-500" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/saved-jobs"
                      className="flex items-center gap-2.5 mx-1 px-3 py-2 text-sm text-black rounded-lg cursor-pointer hover:bg-gray-100 hover:text-black focus:bg-gray-200 focus:text-black transition-colors"
                    >
                      <Bookmark className="h-4 w-4 text-gray-500" />
                      Saved Jobs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2.5 mx-1 px-3 py-2 text-sm text-black rounded-lg cursor-pointer hover:bg-gray-100 hover:text-black focus:bg-gray-200 focus:text-black transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-500" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <div className="mx-3 my-1.5 h-px bg-white/[0.07]" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 mx-1 px-3 py-2 text-sm text-red-600 rounded-lg cursor-pointer hover:bg-red-500/10 hover:text-red-400 focus:bg-red-500/10 focus:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="px-5 py-1.5 text-white rounded-full text-sm border border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button className="px-5 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 hover:from-indigo-600 hover:to-violet-700">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav >
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string }
>(({ className, title, children, href, ...props }, ref) => (
  <li>
    <NavigationMenuLink asChild>
      <Link
        href={href!}
        ref={ref as any}
        className={cn(
          "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          className
        )}
        {...props}
      >
        <div className="text-sm font-medium leading-none">{title}</div>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
          {children}
        </p>
      </Link>
    </NavigationMenuLink>
  </li>
));
ListItem.displayName = "ListItem";