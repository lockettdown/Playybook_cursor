"use client";

import Link from "next/link";
import { Menu, Settings } from "lucide-react";

interface MobileHeaderProps {
  onMenuToggle: () => void;
}

export function MobileHeader({ onMenuToggle }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-pb-border bg-pb-dark px-4 py-3 md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex size-10 items-center justify-center rounded-[10px]"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-white" />
        </button>
        <span className="text-xl font-bold tracking-tight text-pb-orange">
          PLAYYBOOK
        </span>
      </div>
      <Link
        href="/settings"
        className="flex size-10 items-center justify-center"
      >
        <Settings size={24} className="text-pb-muted" />
      </Link>
    </header>
  );
}
