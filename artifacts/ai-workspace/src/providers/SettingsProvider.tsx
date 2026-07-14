import { createContext, useContext, useEffect, useState } from "react";

type Direction = "auto" | "ltr" | "rtl";

interface SettingsContextType {
  direction: Direction;
  setDirection: (dir: Direction) => void;
  enterToSend: boolean;
  setEnterToSend: (v: boolean) => void;
  favoriteModels: string[];
  setFavoriteModels: (ids: string[]) => void;
  toggleFavoriteModel: (id: string) => void;
  defaultModel: string;
  setDefaultModel: (id: string) => void;
  tempChatEnabled: boolean;
  setTempChatEnabled: (v: boolean) => void;
  openRouterKeyConfigured: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [direction, setDirection] = useState<Direction>(() => (localStorage.getItem("app-direction") as Direction) || "auto");
  const [enterToSend, setEnterToSend] = useState<boolean>(() => readJSON<boolean>("app-enter-to-send", true));
  const [favoriteModels, setFavoriteModels] = useState<string[]>(() => readJSON<string[]>("app-favorite-models", []));
  const [defaultModel, setDefaultModel] = useState<string>(() => localStorage.getItem("app-default-model") || "openai/gpt-4o");
  const [tempChatEnabled, setTempChatEnabled] = useState<boolean>(() => readJSON<boolean>("app-temp-chat", false));

  useEffect(() => {
    localStorage.setItem("app-direction", direction);
    if (direction === "auto") document.documentElement.removeAttribute("dir");
    else document.documentElement.dir = direction;
  }, [direction]);

  useEffect(() => { localStorage.setItem("app-enter-to-send", JSON.stringify(enterToSend)); }, [enterToSend]);
  useEffect(() => { localStorage.setItem("app-favorite-models", JSON.stringify(favoriteModels)); }, [favoriteModels]);
  useEffect(() => { localStorage.setItem("app-default-model", defaultModel); }, [defaultModel]);
  useEffect(() => { localStorage.setItem("app-temp-chat", JSON.stringify(tempChatEnabled)); }, [tempChatEnabled]);

  const toggleFavoriteModel = (id: string) => {
    setFavoriteModels((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  return (
    <SettingsContext.Provider value={{ direction, setDirection, enterToSend, setEnterToSend, favoriteModels, setFavoriteModels, toggleFavoriteModel, defaultModel, setDefaultModel, tempChatEnabled, setTempChatEnabled, openRouterKeyConfigured: true }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
}
