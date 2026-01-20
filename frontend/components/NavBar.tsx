"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  LogOut, 
  Bookmark, 
  Settings 
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Navbar() {
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

  return (
    <nav className="absolute top-0 left-0 w-full z-50 bg-black py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          
          <span className="text-white font-bold text-xl tracking-tight hidden sm:block">
            JobScraper
          </span>
        </Link>

        <div className="hidden lg:block">
          <NavigationMenu>
            <NavigationMenuList className="gap-2">
              
              <NavigationMenuItem>
                <Link href="/" passHref={true}>
                  <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "bg-transparent text-gray-200 hover:bg-white/10 hover:text-white")}>
                    Home
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-200 hover:bg-white/10 hover:text-white">
                  Services
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    <ListItem href="/services/scraping" title="AI Scraping">
                      Automated job extraction using advanced LLMs.
                    </ListItem>
                    <ListItem href="/services/analytics" title="Market Stats">
                      Real-time insights into industry hiring trends.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/stats" passHref>
                  <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "bg-transparent text-gray-200 hover:bg-white/10 hover:text-white")}>
                    Portfolio
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-white/20 p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback>{session.user?.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 mt-2">
                <div className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback>{session.user?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate w-[180px]">{session.user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/saved-jobs" className="flex items-center cursor-pointer">
                      <Bookmark className="mr-2 h-4 w-4" />
                      <span>Saved Jobs</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10">Login</Button>
              </Link>
              <Link href="/contact">
                <Button className="rounded-xl font-semibold text-white bg-gradient-to-r from-[#4e54c8] to-[#8f94fb] hover:opacity-90 shadow-lg border-none px-6">
                  +1-256-548-8850
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string }
>(({ className, title, children, href, ...props }, ref) => {
  return (
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
  );
});
ListItem.displayName = "ListItem";