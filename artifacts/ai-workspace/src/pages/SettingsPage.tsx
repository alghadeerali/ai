import { useSettings } from "@/providers/SettingsProvider";
import { Star, Check, Search, ImagePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage({ onClose }: { onClose?: () => void }) {
  const { allModels, imageModels, favoriteModels, toggleFavoriteModel, defaultModel, setDefaultModel, modelSearch, setModelSearch } = useSettings();
  const ranked = [
    ...allModels.filter(m => favoriteModels.includes(m.id)).map(m => ({...m, pinned: true})),
    ...allModels.filter(m => !favoriteModels.includes(m.id)),
  ];

  return <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="mt-2 text-muted-foreground">الموديلات محفوظة ومشتركة بين الجوال والديسكتوب.</p>
      </div>
      {onClose && <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>}
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-lg font-semibold"><Search className="h-5 w-5 text-primary" /> البحث عن الموديل</div>
        <Input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="ابحث عن اسم الموديل..." className="mt-4 h-11 rounded-2xl" />
        <div className="mt-4 flex flex-wrap gap-2">
          {ranked.map((m) => {
            const active = favoriteModels.includes(m.id);
            const starred = defaultModel === m.id;
            return <button key={m.id} onClick={() => toggleFavoriteModel(m.id)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/40'}`}>
              {active ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
              {m.name}
              {starred && <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />}
            </button>
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-lg font-semibold"><ImagePlus className="h-5 w-5 text-primary" /> إنشاء صورة</div>
        <div className="mt-4 space-y-2">
          {imageModels.map((m) => <div key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <div><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">الكلفة التقديرية: {m.cost}</div></div>
            <Button size="sm" variant={m.id === defaultModel ? 'default' : 'outline'} onClick={() => setDefaultModel(m.id)}>اختيار</Button>
          </div>)}
        </div>
      </section>
    </div>
  </div>
}
