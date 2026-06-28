"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Floor Map", href: "/floor" },
  { label: "Admin", href: "/admin" },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-background flex-shrink-0">
      <Link href="/floor" className="font-semibold text-foreground tracking-tight mr-2">
        HoldSpace
      </Link>
      <nav className="flex items-center gap-0.5 flex-1">
        {NAV.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
        <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/floor" />
        <UserButton />
      </div>
    </header>
  );
}
