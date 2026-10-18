"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getStoredUser,
  clearStoredUser,
  subscribeToAuthChanges,
  AuthUser
} from "@/lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Product" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/library", label: "3D Library" },
  { href: "/projects", label: "Projects" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync auth state across tabs, navigation, and state events
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setIsMounted(true);
      setUser(getStoredUser());
    }, 0);

    const unsubscribe = subscribeToAuthChanges((updatedUser) => {
      setUser(updatedUser);
    });

    return () => {
      clearTimeout(initTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setMobileOpen(false);
    }, 0);
  }, [pathname]);

  const handleSignOut = () => {
    clearStoredUser();
    setUser(null);
    router.push("/");
  };

  const isAuth = pathname === "/login" || pathname === "/signup";
  const isDark = pathname === "/generate" || pathname === "/result" || isAuth;

  // Render user badge safely without hydration mismatch
  const activeUser = isMounted ? user : null;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isDark ? "dark-cinematic" : ""
      } ${
        isAuth
          ? isScrolled
            ? "border-b border-[#0FA4AF]/20 bg-[#071D20]/80 backdrop-blur-xl shadow-md"
            : "border-b border-transparent bg-[#071D20]/60 backdrop-blur-md"
          : isScrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl shadow-sm"
          : "border-b border-transparent bg-background/60 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${
              isAuth
                ? "bg-[#0FA4AF]/15 text-[#0FA4AF] group-hover:bg-[#0FA4AF]/25 shadow-[0_0_12px_rgba(15,164,175,0.3)]"
                : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            }`}>
              <Sparkles className="h-4 w-4" />
            </div>
            <span className={`text-xl font-bold tracking-tight ${isAuth ? "text-[#EAF6F6]" : "text-foreground"}`}>
              NEURA
            </span>
          </Link>

          <nav className="hidden md:flex gap-6 text-sm font-medium">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative py-1 transition-colors duration-175 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ${
                    isAuth
                      ? isActive ? "text-[#0FA4AF] font-semibold" : "text-[#A7C4C6] hover:text-[#EAF6F6]"
                      : isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className={`absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-full ${
                      isAuth ? "bg-[#0FA4AF] shadow-[0_0_8px_rgba(15,164,175,0.6)]" : "bg-primary shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                    }`} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {activeUser ? (
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F2E33] border border-[#0FA4AF]/30 text-xs text-[#EAF6F6]">
                <User className="h-3.5 w-3.5 text-[#0FA4AF]" />
                <span className="font-medium max-w-[120px] truncate">{activeUser.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0FA4AF]/20 text-[#0FA4AF] font-mono">
                  {activeUser.planLabel || (activeUser.isDemoSession ? "Demo" : "Member")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-xs text-[#A7C4C6] hover:text-red-400 gap-1 px-2"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Exit</span>
              </Button>
            </div>
          ) : (
            <Link href={pathname === "/login" ? "/signup" : "/login"}>
              <Button
                variant="ghost"
                className={`hidden sm:inline-flex transition-colors duration-175 ${
                  isAuth
                    ? "text-[#AFDDE5] hover:text-[#EAF6F6] hover:bg-[#0F2E33]/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pathname === "/login" ? "Sign Up" : "Sign In"}
              </Button>
            </Link>
          )}

          <Link href="/create">
            <Button
              className={
                isAuth
                  ? "bg-gradient-to-r from-[#024950] to-[#0FA4AF] hover:from-[#035d67] hover:to-[#12b9c6] text-[#EAF6F6] shadow-[0_0_15px_rgba(15,164,175,0.3)] transition-all duration-200"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
              }
            >
              Create Video
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className={`md:hidden ${isAuth ? "text-[#EAF6F6]" : "text-foreground"}`}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isDark ? "dark-cinematic" : ""
        } ${mobileOpen ? "max-h-64 border-t border-border" : "max-h-0"}`}
      >
        <nav className={`flex flex-col gap-1 p-4 backdrop-blur-xl ${
          isAuth ? "bg-[#071D20]/95" : "bg-background/95"
        }`}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-175 ${
                  isAuth
                    ? isActive ? "bg-[#0FA4AF]/15 text-[#0FA4AF]" : "text-[#A7C4C6] hover:text-[#EAF6F6] hover:bg-[#0F2E33]/40"
                    : isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <div className="mt-2 flex gap-2">
            {activeUser ? (
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="flex-1 text-[#A7C4C6] hover:text-red-400"
              >
                Sign Out ({activeUser.name})
              </Button>
            ) : (
              <Link href={pathname === "/login" ? "/signup" : "/login"} className="flex-1">
                <Button
                  variant="ghost"
                  className={`w-full ${isAuth ? "text-[#AFDDE5]" : "text-muted-foreground"}`}
                >
                  {pathname === "/login" ? "Sign Up" : "Sign In"}
                </Button>
              </Link>
            )}
            <Link href="/create" className="flex-1">
              <Button className={`w-full ${
                isAuth
                  ? "bg-gradient-to-r from-[#024950] to-[#0FA4AF] text-[#EAF6F6]"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}>
                Create Video
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
