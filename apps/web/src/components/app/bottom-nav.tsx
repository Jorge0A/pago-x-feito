"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, LayoutDashboard, MoreHorizontal, Table2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ obraId, inboxCount = 0 }: { obraId: string; inboxCount?: number }) {
  const pathname = usePathname();
  const base = `/app/${obraId}`;
  const items = [
    { href: `${base}/entrada`, label: "Entrada", icon: Inbox, badge: inboxCount },
    { href: base, label: "Resumo", icon: LayoutDashboard, exact: true },
    { href: `${base}/orcamento`, label: "Orçamento", icon: Table2 },
    { href: `${base}/fornecedores`, label: "Fornecedores", icon: Users },
    { href: `${base}/mais`, label: "Mais", icon: MoreHorizontal, also: [`${base}/obra`, `${base}/documentos`] },
  ];
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, label, icon: Icon, exact, badge, also }) => {
          const active = exact ? pathname === href : pathname.startsWith(href) || (also ?? []).some((a) => pathname.startsWith(a));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-[#0f5132]" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                  {badge ? (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0f5132] px-1 text-[10px] font-semibold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
