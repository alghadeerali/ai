import { createContext, useContext, useEffect, useState } from "react";

type Direction = "auto" | "ltr" | "rtl";

interface SettingsContextType {
  direction: Direction;
  setDirection: (dir: Direction) => void;
  openRouterKeyConfigured: boolean; // Just a mock for settings
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [direction, setDirection] = useState<Direction>(() => {
    return (localStorage.getItem("app-direction") as Direction) || "auto";
  });

  useEffect(() => {
    localStorage.setItem("app-direction", direction);
    if (direction === "auto") {
      document.documentElement.removeAttribute("dir");
    } else {
      document.documentElement.dir = direction;
    }
  }, [direction]);

  return (
    <SettingsContext.Provider
      value={{
        direction,
        setDirection,
        openRouterKeyConfigured: true,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
