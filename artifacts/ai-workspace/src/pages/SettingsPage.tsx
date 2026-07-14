import { useState, useMemo } from "react";
import { useSettings } from "@/providers/SettingsProvider";
import { useTheme } from "next-themes";
import { useListModels } from "@workspace/api-client-react";
import { Settings, Moon, Sun, Monitor, AlignLeft, AlignRight, Key, MessageSquare, Cpu, Star, Search, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A model is treated as "image-capable" if its id/name/description hints at image generation.
function isImageModel(m: any): boolean {
  const text = `${m.id} ${m.name} ${m.description ?? ""}`.toLowerCase();
  return (
    text.includes("image") ||
    text.includes("vision") ||
    text.includes("dall-e") ||
    text.includes("dalle") ||
    text.includes("flux") ||
    text.includes("stable-diffusion") ||
    text.includes("midjourney") ||
    text.includes("gemini-2") ||
    text.includes("imagen")
  );
}

function estimateImageCost(m: any): string {
  // Rough estimate based on completion pricing per 1K tokens, scaled as a stand-in
  // for a single generated image (actual OpenRouter image pricing varies by model).
  const p = Number(m.pricingCompletion ?? m.pricingPrompt ?? 0);
  if (!p || Number.isNaN(p)) return "غير متوفر";
  const estimate = p * 1000; // rough scaling heuristic
  if (estimate <= 0) return "مجاني";
  return `~$${estimate.toFixed(4)}`;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    direction,
    setDirection,
    openRouterKeyConfigured,
    enterToSend,
    setEnterToSend,
    favoriteModels,
    toggleFavoriteModel,
    defaultModel,
    setDefaultModel,
  } = useSettings();
  const { data: models } = useListModels();
  const [modelSearch, setModelSearch] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Sort: favorites always first (most-recently-favorited on top), rest keep original order.
  const sortedModels = useMemo(() => {
    if (!models) return [];
    const favSet = new Set(favoriteModels);
    const favs = favoriteModels
      .map((id) => models.find((m) => m.id === id))
      .filter(Boolean) as typeof models;
    const rest = models.filter((m) => !favSet.has(m.id));
    return [...favs, ...rest];
  }, [models, favoriteModels]);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return sortedModels;
    return sortedModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q),
    );
  }, [sortedModels, modelSearch]);

  const displayedModels = modelSearch ? filteredModels : filteredModels.slice(0, 15);

  const imageModels = useMemo(() => {
    if (!models) return [];
    return models.filter(isImageModel);
  }, [models]);

  return (
    <div className="flex-1 p-4 sm:p-8 bg-background overflow-y-auto overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-8 w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage app preferences and configurations.</p>
        </div>

        <div className="grid gap-6">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription>Customize how AI Workspace looks on your device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme</Label>
                <RadioGroup 
                  value={theme || "light"} 
                  onValueChange={setTheme}
                  className="grid grid-cols-3 gap-4"
                >
                  <Label
                    htmlFor="theme-light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                    <Sun className="mb-3 h-6 w-6" />
                    Light
                  </Label>
                  <Label
                    htmlFor="theme-dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                    <Moon className="mb-3 h-6 w-6" />
                    Dark
                  </Label>
                  <Label
                    htmlFor="theme-system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                    <Monitor className="mb-3 h-6 w-6" />
                    System
                  </Label>
                </RadioGroup>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Text Direction</Label>
                <CardDescription className="mb-3">
                  Force the chat interface to Left-to-Right or Right-to-Left (useful for Arabic).
                </CardDescription>
                <RadioGroup 
                  defaultValue={direction} 
                  onValueChange={(val: any) => setDirection(val)}
                  className="grid grid-cols-3 gap-4"
                >
                  <Label
                    htmlFor="dir-auto"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="auto" id="dir-auto" className="sr-only" />
                    <Monitor className="mb-3 h-6 w-6" />
                    Auto Detect
                  </Label>
                  <Label
                    htmlFor="dir-ltr"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="ltr" id="dir-ltr" className="sr-only" />
                    <AlignLeft className="mb-3 h-6 w-6" />
                    LTR
                  </Label>
                  <Label
                    htmlFor="dir-rtl"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
                  >
                    <RadioGroupItem value="rtl" id="dir-rtl" className="sr-only" />
                    <AlignRight className="mb-3 h-6 w-6" />
                    RTL
                  </Label>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> المحادثة
              </CardTitle>
              <CardDescription>تحكّم في سلوك الإرسال والنماذج.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">زر Enter يرسل الرسالة</Label>
                  <p className="text-xs text-muted-foreground">
                    عند التفعيل: Enter يرسل و Shift+Enter سطر جديد. عند الإيقاف: Enter سطر جديد و Ctrl/Cmd+Enter يرسل.
                  </p>
                </div>
                <Switch checked={enterToSend} onCheckedChange={setEnterToSend} />
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> إنشاء صورة
                </Label>
                <CardDescription>
                  اطّلع على النماذج القادرة على توليد الصور مع الكلفة التقديرية لكل واحد.
                </CardDescription>
                <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full max-w-sm justify-start gap-2">
                      <ImageIcon className="h-4 w-4" />
                      إنشاء صورة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" /> نماذج توليد الصور
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-80">
                      <div className="space-y-1 pr-2">
                        {imageModels.length === 0 && (
                          <p className="text-sm text-muted-foreground p-4 text-center">
                            لا توجد نماذج متاحة حالياً لتوليد الصور.
                          </p>
                        )}
                        {imageModels.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                          >
                            <span className="text-sm flex-1 truncate">{m.name}</span>
                            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                              {estimateImageCost(m)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> النموذج الافتراضي للمحادثات الجديدة
                </Label>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="اختر نموذجاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4" /> النماذج المفضّلة
                </Label>
                <CardDescription>
                  أول 15 نموذجاً تظهر تلقائياً بالأعلى. اضغط على العلامة (✓) لتثبيت نموذج فيرتفع لأعلى القائمة،
                  واضغط على النجمة لجعله النموذج الافتراضي للمحادثات الجديدة.
                </CardDescription>
                <div className="relative max-w-sm">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="ابحث عن نموذج..."
                    className="pr-9"
                  />
                </div>
                <ScrollArea className="h-64 rounded-md border border-border p-2">
                  <div className="space-y-1">
                    {displayedModels?.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`fav-${m.id}`}
                          checked={favoriteModels.includes(m.id)}
                          onCheckedChange={() => toggleFavoriteModel(m.id)}
                        />
                        <label
                          htmlFor={`fav-${m.id}`}
                          className="text-sm flex-1 truncate cursor-pointer"
                        >
                          {m.name}
                        </label>
                        {m.isFree && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            Free
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setDefaultModel(m.id)}
                          title="اجعله النموذج الافتراضي"
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              defaultModel === m.id
                                ? "fill-primary text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                    {displayedModels?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        لا توجد نتائج مطابقة.
                      </p>
                    )}
                  </div>
                </ScrollArea>
                {favoriteModels.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    مختار {favoriteModels.length} نموذج.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Integrations</CardTitle>
              <CardDescription>API Keys and external services.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">OpenRouter API Key</h4>
                    <p className="text-sm text-muted-foreground">Used for routing AI requests</p>
                  </div>
                </div>
                <div>
                  {openRouterKeyConfigured ? (
                    <div className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Configured
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                      Missing
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                API keys are managed securely on the backend via environment variables. Contact your administrator to update them.
                يتم حفظ هذه المفاتيح كمتغيرات بيئة (Environment Variables) على منصة Render، وليست في قاعدة البيانات أو المتصفح.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
