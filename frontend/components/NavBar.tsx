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
    <nav className="fixed bg-background top-0 left-0 w-full z-50 backdrop-blur-md shadow-sm py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-bold text-foreground text-xl tracking-tight hidden sm:block">
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
                      "bg-transparent text-foreground hover:bg-popover/10 hover:text-foreground focus:bg-popover/10 focus:text-foreground"
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
                      "bg-transparent text-foreground hover:bg-popover/10 hover:text-foreground focus:bg-popover/10 focus:text-foreground"
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
                      "bg-transparent text-foreground hover:bg-popover/10 hover:text-foreground focus:bg-popover/10 focus:text-foreground"
                    )}
                  >
                    Portfolio
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/documentation"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent text-foreground hover:bg-popover/10 hover:text-foreground focus:bg-popover/10 focus:text-foreground"
                    )}
                  >
                    Documentation
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
              className="relative border-border text-foreground bg-transparent hover:bg-popover/10 hover:text-foreground"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-foreground">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}

          {status === "loading" ? (
            <div className="w-10 h-10 rounded-full bg-popover/10 animate-pulse" />
          ) : session ? (

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 rounded-full ring-2 ring-border hover:ring-primary transition-all duration-200 focus:outline-none">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback className="bg-muted text-foreground text-sm font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-60 p-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              >
                {/* user header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback className="bg-muted text-foreground text-sm font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {session.user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.user?.email}
                    </p>
                  </div>
                </div>

                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2.5 mx-1 px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer hover:bg-accent hover:text-foreground focus:bg-muted focus:text-primary-foreground transition-colors"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/saved-jobs"
                      className="flex items-center gap-2.5 mx-1 px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer hover:bg-accent hover:text-foreground focus:bg-muted focus:text-primary-foreground transition-colors"
                    >
                      <Bookmark className="h-4 w-4 text-muted-foreground" />
                      Saved Jobs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2.5 mx-1 px-3 py-2 text-sm text-foreground rounded-lg cursor-pointer hover:bg-accent hover:text-foreground focus:bg-muted focus:text-primary-foreground transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <div className="mx-3 my-1.5 h-px bg-border" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 mx-1 px-3 py-2 text-sm text-destructive rounded-lg cursor-pointer hover:bg-destructive/10 hover:text-destructive focus:bg-red-500/10 focus:text-destructive transition-colors"
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
                  className="px-5 py-1.5 text-foreground rounded-full text-sm border border-border hover:bg-accent hover:text-foreground"
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button className="px-5 py-1.5 rounded-full text-sm font-medium bg-primary text-background border-0 hover:bg-primary/90">
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