"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  BookOpen,
  CalendarDays,
  PenTool,
  Trophy,
  Users,
  Settings,
  MessageCircle,
} from "lucide-react";

const sidebarItems = [
  { label: "Home", href: "/", icon: LayoutGrid },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Whiteboard", href: "/whiteboard", icon: PenTool },
  { label: "Game Center", href: "/game-center", icon: Trophy },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-pb-dark border-r border-pb-border">
      <div className="flex items-center gap-3 border-b border-pb-border px-6 py-5">
        <BookOpen size={32} className="text-pb-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-pb-orange">
          PLAYYBOOK
        </h1>
      </div>

      <nav className="flex flex-col gap-2 px-4 pt-4">
        {sidebarItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-[10px] px-4 py-3 text-base font-semibold transition-colors ${
                isActive
                  ? "bg-pb-active text-pb-orange"
                  : "text-pb-muted hover:bg-pb-card hover:text-white"
              }`}
            >
              <Icon size={24} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
