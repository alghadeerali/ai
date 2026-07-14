import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { SettingsProvider } from "@/providers/SettingsProvider";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <div className="flex flex-col md:flex-row min-h-[100dvh] max-w-[100vw] bg-background text-foreground overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden relative">
          {children}
        </main>
      </div>
    </SettingsProvider>
  );
}
