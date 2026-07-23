"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CalendarClock,
  PieChart,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/contas", label: "Contas", icon: Wallet },
  { href: "/app/lancamentos", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/app/pagar-receber", label: "Pagar / Receber", icon: CalendarClock },
  { href: "/app/relatorios", label: "Relatórios", icon: PieChart },
];

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {links.map((link) => {
        const active =
          link.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-ink-900 text-mint-50"
                : "text-ink-800/80 hover:bg-mint-100"
            )}
          >
            <Icon size={18} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 animate-drift rounded-full bg-mint-200/50 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 animate-pulse-soft rounded-full bg-mint-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--line)] bg-white/60 backdrop-blur md:flex">
          <div className="border-b border-[var(--line)] px-5 py-6">
            <Link href="/app" className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Fluxa
            </Link>
            <p className="mt-1 text-xs text-ink-800/60">Gestão financeira</p>
          </div>
          {nav}
          <div className="border-t border-[var(--line)] p-4">
            <p className="truncate text-sm font-semibold text-ink-900">{userName}</p>
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-800/70 hover:bg-sand-100"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--line)] bg-sand-50/80 px-4 py-3 backdrop-blur md:hidden">
            <Link href="/app" className="font-display text-xl font-bold text-ink-900">
              Fluxa
            </Link>
            <button
              className="rounded-xl border border-[var(--line)] bg-white/80 p-2"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </header>

          {open && (
            <div className="border-b border-[var(--line)] bg-white/90 md:hidden">
              {nav}
              <div className="border-t border-[var(--line)] p-4">
                <button
                  onClick={logout}
                  className="flex items-center gap-2 text-sm font-medium text-ink-800/70"
                >
                  <LogOut size={16} /> Sair
                </button>
              </div>
            </div>
          )}

          <main className="relative flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
