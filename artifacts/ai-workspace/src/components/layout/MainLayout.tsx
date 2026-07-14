import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { SettingsProvider } from "@/providers/SettingsProvider";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <div className="flex min-h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </SettingsProvider>
  );
}
