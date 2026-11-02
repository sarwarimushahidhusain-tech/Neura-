"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Video, Menu, X, LogOut, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getStoredUser,
  clearStoredUser,
  subscribeToAuthChanges,
  AuthUser
} from "@/lib/auth";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#examples", label: "Examples" },
  { href: "/projects", label: "Projects" },
];

// Nav links only shown to authenticated users
const AUTH_NAV_LINKS = [
  { href: "/dashboard", label: "My Learning", icon: LayoutDashboard },
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

  useEffect(() => {
    const initTimer = setTimeout(() => {
      setIsMounted(true);
      setUser(getStoredUser());
    }, 0);

    const unsubscribe = subscribeToAuthChanges((u) => setUser(u));
    return () => {
      clearTimeout(initTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setTimeout(() => setMobileOpen(false), 0);
  }, [pathname]);

  const handleSignOut = () => {
    clearStoredUser();
    setUser(null);
    router.push("/");
  };

  const activeUser = isMounted ? user : null;
  const isAuth = pathname === "/login" || pathname === "/signup";

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "border-b border-[#1B2635] bg-[#050810]/90 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "border-b border-transparent bg-[#050810]/70 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center px-4 md:px-8 relative">
        {/* Left — Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4E8] rounded-lg flex-shrink-0"
          aria-label="Neura home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00D4E8]/10 border border-[#00D4E8]/30 text-[#00D4E8] group-hover:bg-[#00D4E8]/20 group-hover:shadow-[0_0_15px_rgba(0,212,232,0.4)] transition-all duration-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-[0.14em] text-[#F5F7FC] uppercase">
            NEURA
          </span>
        </Link>

        {/* Center — Pill Nav (desktop) */}
        <nav
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 bg-[#0B101C]/80 border border-[#1B2635] rounded-full px-2 py-1.5 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = href === "/projects"
              ? pathname.startsWith("/projects")
              : href === "/"
              ? pathname === "/"
              : false;
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4E8] ${
                  isActive
                    ? "bg-[#00D4E8]/10 text-[#00D4E8] shadow-[0_0_10px_rgba(0,212,232,0.15)]"
                    : "text-[#9AA8BC] hover:text-[#F5F7FC] hover:bg-[#101625]"
                }`}
              >
                {label}
              </Link>
            );
          })}
          {activeUser && AUTH_NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4E8] flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#00D4E8]/10 text-[#00D4E8] shadow-[0_0_10px_rgba(0,212,232,0.15)]"
                    : "text-[#9AA8BC] hover:text-[#F5F7FC] hover:bg-[#101625]"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right — Auth + CTA */}
        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          {activeUser ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B101C] border border-[#1B2635] text-xs text-[#F5F7FC]">
                <User className="h-3 w-3 text-[#00D4E8]" />
                <span className="font-medium max-w-[100px] truncate">{activeUser.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-xs text-[#9AA8BC] hover:text-red-400 gap-1 px-2 h-8"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Link href={isAuth ? (pathname === "/login" ? "/signup" : "/login") : "/login"}>
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-xs font-medium text-[#9AA8BC] hover:text-[#F5F7FC] hover:bg-transparent transition-colors duration-200 px-3"
              >
                Sign In
              </Button>
            </Link>
          )}

          <Link href="/create">
            <Button
              className="bg-gradient-to-r from-[#00D4E8] to-[#00C9B7] hover:opacity-95 text-[#050810] font-semibold text-xs px-4 py-2 rounded-full shadow-[0_0_20px_rgba(0,212,232,0.35)] hover:shadow-[0_0_28px_rgba(0,212,232,0.55)] transition-all duration-200 gap-2 flex items-center"
            >
              <Video className="h-3.5 w-3.5" />
              Create Video
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-[#9AA8BC] hover:text-[#F5F7FC] h-9 w-9"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-72 border-t border-[#1B2635]" : "max-h-0"
        }`}
      >
        <nav className="flex flex-col gap-1 p-4 bg-[#050810]/95 backdrop-blur-xl">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-3 rounded-xl text-xs font-medium text-[#9AA8BC] hover:text-[#F5F7FC] hover:bg-[#0B101C] transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
          {activeUser && AUTH_NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-3 rounded-xl text-xs font-medium transition-colors duration-200 flex items-center gap-2 ${
                pathname.startsWith(href)
                  ? "text-[#00D4E8] bg-[#00D4E8]/10"
                  : "text-[#9AA8BC] hover:text-[#F5F7FC] hover:bg-[#0B101C]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
          <div className="mt-3 flex gap-2 pt-3 border-t border-[#1B2635]">
            {activeUser ? (
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="flex-1 text-xs text-[#9AA8BC] hover:text-red-400"
              >
                Sign Out ({activeUser.name})
              </Button>
            ) : (
              <Link href="/login" className="flex-1">
                <Button variant="ghost" className="w-full text-xs text-[#9AA8BC]">
                  Sign In
                </Button>
              </Link>
            )}
            <Link href="/create" className="flex-1">
              <Button className="w-full bg-[#00D4E8] text-[#050810] font-semibold text-xs rounded-full">
                Create Video
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
