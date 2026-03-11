"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-64 border-r border-pb-border bg-pb-dark p-0">
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader onMenuToggle={() => setDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
