import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Direction = "auto" | "ltr" | "rtl";

type ModelMeta = { id: string; name: string; image?: boolean; cost?: string };

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
  allModels: ModelMeta[];
  imageModels: ModelMeta[];
  setModelSearch: (v: string) => void;
  modelSearch: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function readJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

const DEFAULT_MODELS: ModelMeta[] = [
  { id: 'openai/gpt-4o', name: 'GPT-4o', cost: '$$$' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', cost: '$' },
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', cost: '$$$' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', cost: '$$$' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', cost: '$' },
  { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', cost: '$' },
  { id: 'google/gemini-2.0-pro', name: 'Gemini 2.0 Pro', cost: '$$$' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', cost: '$$' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', cost: '$$' },
  { id: 'cohere/command-r-plus', name: 'Command R+', cost: '$$' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', cost: '$' },
  { id: 'deepseek/deepseek-reasoner', name: 'DeepSeek Reasoner', cost: '$$' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder', cost: '$' },
  { id: 'rekaai/reka-flash', name: 'Reka Flash', cost: '$' },
  { id: 'openrouter/auto', name: 'OpenRouter Auto', cost: '$$' },
];

const IMAGE_MODELS: ModelMeta[] = [
  { id: 'black-forest-labs/flux-1.1-pro', name: 'Flux 1.1 Pro', image: true, cost: '$$$' },
  { id: 'black-forest-labs/flux-1-schnell', name: 'Flux 1 Schnell', image: true, cost: '$' },
  { id: 'stabilityai/stable-diffusion-3.5-large', name: 'SD 3.5 Large', image: true, cost: '$$' },
  { id: 'stabilityai/stable-diffusion-xl', name: 'SDXL', image: true, cost: '$' },
  { id: 'ideogram/ideogram-v2', name: 'Ideogram v2', image: true, cost: '$$' },
  { id: 'recraft/recraft-v3', name: 'Recraft v3', image: true, cost: '$$' },
];

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [direction, setDirection] = useState<Direction>(() => (localStorage.getItem("app-direction") as Direction) || "auto");
  const [enterToSend, setEnterToSend] = useState<boolean>(() => readJSON<boolean>("app-enter-to-send", true));
  const [favoriteModels, setFavoriteModels] = useState<string[]>(() => readJSON<string[]>("app-favorite-models", [DEFAULT_MODELS[0].id]));
  const [defaultModel, setDefaultModel] = useState<string>(() => localStorage.getItem("app-default-model") || DEFAULT_MODELS[0].id);
  const [tempChatEnabled, setTempChatEnabled] = useState<boolean>(() => readJSON<boolean>("app-temp-chat", false));
  const [modelSearch, setModelSearch] = useState<string>("");

  useEffect(() => { localStorage.setItem("app-direction", direction); if (direction === "auto") document.documentElement.removeAttribute("dir"); else document.documentElement.dir = direction; }, [direction]);
  useEffect(() => { localStorage.setItem("app-enter-to-send", JSON.stringify(enterToSend)); }, [enterToSend]);
  useEffect(() => { localStorage.setItem("app-favorite-models", JSON.stringify(favoriteModels)); }, [favoriteModels]);
  useEffect(() => { localStorage.setItem("app-default-model", defaultModel); }, [defaultModel]);
  useEffect(() => { localStorage.setItem("app-temp-chat", JSON.stringify(tempChatEnabled)); }, [tempChatEnabled]);

  const toggleFavoriteModel = (id: string) => setFavoriteModels((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [id, ...prev]);
  const allModels = useMemo(() => {
    const items = DEFAULT_MODELS.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()));
    return items;
  }, [modelSearch]);
  const imageModels = useMemo(() => IMAGE_MODELS.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase())), [modelSearch]);

  return <SettingsContext.Provider value={{ direction, setDirection, enterToSend, setEnterToSend, favoriteModels, setFavoriteModels, toggleFavoriteModel, defaultModel, setDefaultModel, tempChatEnabled, setTempChatEnabled, openRouterKeyConfigured: true, allModels, imageModels, setModelSearch, modelSearch }}>{children}</SettingsContext.Provider>;
}

export function useSettings() { const context = useContext(SettingsContext); if (!context) throw new Error("useSettings must be used within a SettingsProvider"); return context; }
