"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Trophy,
  PenTool,
  ClipboardList,
  MessageCircle,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: LayoutGrid },
  { label: "Game Center", href: "/game-center", icon: Trophy },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "WhiteBoard", href: "/whiteboard", icon: PenTool },
  { label: "Practice", href: "/practice", icon: ClipboardList },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] border-t-2 border-pb-surface bg-pb-dark md:hidden">
      <div className="flex items-center justify-between px-4 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-[48px] flex-col items-center gap-1 py-1"
            >
              <Icon
                size={24}
                className={isActive ? "text-pb-orange" : "text-pb-muted"}
              />
              <span
                className={`text-[10px] font-medium tracking-wide ${
                  isActive ? "text-pb-orange" : "text-pb-muted"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
