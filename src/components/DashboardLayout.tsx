"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Stethoscope,
  Calendar,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  ShoppingCart,
  Heart,
  Package,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userName: string;
  userInitial: string;
  role: "patient" | "doctor";
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  footer?: React.ReactNode;
}

const GREETING_STYLE = {
  doctorLabel: "Doctor",
  nonDoctorPrefix: "Hello",
  nonDoctorUseComma: true,
};

export default function DashboardLayout({
  children,
  navItems,
  userName,
  userInitial,
  role,
  theme,
  onToggleTheme,
  footer,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const normalizedName = (userName || (role === "doctor" ? "Doctor" : "Patient")).trim();
  const normalizedNameWithoutTitle = normalizedName.replace(/^(dr\.?|doctor)\s+/i, "").trim();
  const firstName = (normalizedNameWithoutTitle || normalizedName).split(/\s+/)[0] || normalizedName;
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const currentHour = new Date().getHours();
  const doctorTimeGreeting = currentHour < 12
    ? "Good Morning"
    : currentHour < 17
      ? "Good Afternoon"
      : "Good Evening";
  const headerGreeting = role === "doctor"
    ? `${GREETING_STYLE.nonDoctorPrefix}${GREETING_STYLE.nonDoctorUseComma ? "," : ""} ${doctorTimeGreeting} ${GREETING_STYLE.doctorLabel}`
    : `${GREETING_STYLE.nonDoctorPrefix}${GREETING_STYLE.nonDoctorUseComma ? "," : ""} ${displayName}`;
  const displayInitial =
    firstName.charAt(0).toUpperCase() ||
    userInitial?.charAt(0).toUpperCase() ||
    (role === "doctor" ? "D" : "P");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const profileLinks = role === "patient"
    ? [
        { href: "/patient/profile", label: "My Profile", icon: User },
        { href: "/pharmacy/cart", label: "Cart Items", icon: ShoppingCart },
        { href: "/pharmacy/wishlist", label: "Wishlist", icon: Heart },
        { href: "/pharmacy/orders", label: "My Orders", icon: Package },
      ]
    : [
        { href: "/doctor/profile", label: "My Profile", icon: User },
        { href: "/doctor/profile/edit", label: "Edit Profile", icon: User },
        { href: "/doctor/schedule", label: "My Schedule", icon: Calendar },
        { href: "/doctor/past-appointments", label: "Past Appointments", icon: Calendar },
      ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-sky-500" />
            <span className="text-xl font-bold">
              <span className="bg-linear-to-r from-sky-500 to-sky-700 bg-clip-text text-transparent">
                TeleHealth
              </span>
            </span>
          </Link>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                  isActive
                    ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-sky-500" : "",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:bg-red-50 hover:text-red-500 dark:text-slate-300 dark:hover:bg-red-500/15 dark:hover:text-red-300"
            onClick={async () => {
              try {
                await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || "/backend"}/api/auth/logout`,
                  { credentials: "include" },
                );
              } finally {
                window.location.href = "/auth";
              }
            }}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-h-screen flex-1 flex-col md:ml-64">
        {/* Header */}
        <header className="fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between border-b border-slate-200/50 bg-white/70 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 md:left-64 md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 sm:text-2xl">
              {headerGreeting}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {onToggleTheme && (
              <Button
                type="button"
                variant="outline"
                onClick={onToggleTheme}
                className="h-10 w-10 rounded-full border-slate-300 bg-white/80 p-0 text-slate-700 backdrop-blur hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 p-1 pr-2 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label="Open profile menu"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold",
                    "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
                  )}
                >
                  {displayInitial}
                </span>
                <ChevronDown className={cn("h-4 w-4 text-slate-500 transition", profileMenuOpen && "rotate-180")} />
              </button>

              {profileMenuOpen && profileLinks.length > 0 && (
                <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {profileLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setProfileMenuOpen(false)}
                        className={cn(
                          "mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                          pathname === item.href
                            ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-6 pt-28 md:p-8 md:pt-28"
        >
          {children}
        </motion.div>

        {/* Footer */}
        {footer && <div className="w-full">{footer}</div>}
      </main>
    </div>
  );
}
