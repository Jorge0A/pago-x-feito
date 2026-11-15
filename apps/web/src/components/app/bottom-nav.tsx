"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Table2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ obraId }: { obraId: string }) {
  const pathname = usePathname();
  const base = `/app/${obraId}`;
  const items = [
    { href: base, label: "Resumo", icon: LayoutDashboard, exact: true },
    { href: `${base}/orcamento`, label: "Orçamento", icon: Table2 },
    { href: `${base}/fornecedores`, label: "Fornecedores", icon: Users },
    { href: `${base}/obra`, label: "Obra", icon: Building2 },
  ];
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-[#0f5132]" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
