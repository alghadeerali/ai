import { ReactNode } from "react";
import { SettingsProvider } from "@/providers/SettingsProvider";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <SettingsProvider><div className="min-h-[100dvh] w-full bg-background text-foreground">{children}</div></SettingsProvider>;
}
