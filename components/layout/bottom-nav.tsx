"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Map, PlusCircle, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/map" as const, icon: Map, labelKey: "map" as const },
  { href: "/report" as const, icon: PlusCircle, labelKey: "report" as const },
  {
    href: "/leaderboard" as const,
    icon: Trophy,
    labelKey: "leaderboard" as const,
  },
  { href: "/profile" as const, icon: User, labelKey: "profile" as const },
];

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 pb-safe backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const isReport = item.labelKey === "report";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                isReport && !isActive && "text-primary"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isReport && "h-7 w-7"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(isActive && "font-semibold")}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
