"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sparkles, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Product" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/projects", label: "Projects" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setTimeout(() => setMobileOpen(false), 0);
  }, [pathname]);

  const isDark = pathname === "/generate" || pathname === "/result";

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isDark ? "dark-cinematic" : ""
      } ${
        isScrolled
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all duration-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">NEURA</span>
          </Link>

          <nav className="hidden md:flex gap-6 text-sm font-medium">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative py-1 transition-colors duration-175 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ${
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary rounded-full shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="hidden sm:inline-flex text-muted-foreground hover:text-foreground transition-colors duration-175"
          >
            Sign In
          </Button>
          <Link href="/create">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Create Video
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground"
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
        <nav className="flex flex-col gap-1 p-4 bg-background/95 backdrop-blur-xl">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-175 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" className="flex-1 text-muted-foreground">Sign In</Button>
            <Link href="/create" className="flex-1">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Create Video</Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
