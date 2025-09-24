"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const links = [
  { href: "/", label: "Главная" },
  { href: "/generate", label: "Новая генерация" },
  { href: "/editor", label: "Редактор кейсов" },
  { href: "/changes", label: "Изменения" },
  { href: "/export", label: "Экспорт" },
  { href: "/integrations", label: "Интеграции" },
];

export function Navigation() {
  const pathname = usePathname();

  const activeKey = useMemo(() => {
    if (!pathname || pathname === "/") {
      return "/";
    }
    const match = links.find((link) =>
      link.href !== "/" && pathname.startsWith(link.href),
    );
    return match?.href ?? "/";
  }, [pathname]);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-slate-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold">
            ATD
          </span>
          <span className="text-base font-semibold">Адаптивный дизайнер тестов</span>
        </Link>
        <nav className="hidden items-center gap-2 text-sm text-slate-600 lg:flex">
          {links.map((link) => {
            const isActive = activeKey === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 transition ${
                  isActive ? "bg-slate-100 text-slate-900" : "hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/generate"
          className="hidden rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 md:inline-flex"
        >
          Новый запуск
        </Link>
      </div>
      <div className="lg:hidden">
        <nav className="flex flex-wrap gap-1 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          {links.map((link) => {
            const isActive = activeKey === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 transition ${
                  isActive ? "bg-slate-900 text-white" : "bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
