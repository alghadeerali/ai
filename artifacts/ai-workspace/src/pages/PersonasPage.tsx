import { useState } from "react";
import { 
  useListPersonas, 
  useCreatePersona, 
  useUpdatePersona, 
  useDeletePersona,
  getListPersonasQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Plus, 
  Settings2, 
  Trash2, 
  Lock,
  ThermometerSun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export default function PersonasPage() {
  const queryClient = useQueryClient();
  const { data: personas, isLoading } = useListPersonas();
  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();
  const deletePersona = useDeletePersona();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  // Editor state
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);

  const openEditor = (persona?: any) => {
    if (persona) {
      setEditId(persona.id);
      setName(persona.name);
      setDescription(persona.description || "");
      setEmoji(persona.emoji || "🤖");
      setSystemPrompt(persona.systemPrompt);
      setTemperature(persona.temperature);
    } else {
      setEditId(null);
      setName("");
      setDescription("");
      setEmoji("🤖");
      setSystemPrompt("You are a helpful assistant.");
      setTemperature(0.7);
    }
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error("Name and System Prompt are required");
      return;
    }

    const payload = {
      name,
      description,
      emoji,
      systemPrompt,
      temperature,
    };

    if (editId) {
      updatePersona.mutate({ id: editId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPersonasQueryKey() });
          setIsEditorOpen(false);
          toast.success("Persona updated");
        }
      });
    } else {
      createPersona.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPersonasQueryKey() });
          setIsEditorOpen(false);
          toast.success("Persona created");
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deletePersona.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPersonasQueryKey() });
        setDeleteId(null);
        toast.success("Persona deleted");
      }
    });
  };

  return (
    <div className="flex-1 p-8 bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Personas
            </h1>
            <p className="text-muted-foreground mt-1">Manage system prompts and agent identities.</p>
          </div>
          <Button onClick={() => openEditor()} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> New Persona
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse bg-muted/20 border-border">
                <CardHeader className="h-24"></CardHeader>
                <CardContent className="h-20"></CardContent>
              </Card>
            ))
          ) : personas?.map((persona) => (
            <Card key={persona.id} className="border-border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-3 flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex gap-3 items-center">
                  <div className="text-3xl bg-secondary/50 w-12 h-12 rounded-xl flex items-center justify-center border border-border/50">
                    {persona.emoji || "🤖"}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{persona.name}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                      <ThermometerSun className="h-3 w-3" /> Temp: {persona.temperature}
                      {persona.isDefault && (
                        <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] uppercase tracking-wider">System</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {persona.description || "No description provided."}
                </p>
                <div className="mt-4 text-xs font-mono bg-muted/50 p-3 rounded-md line-clamp-3 text-muted-foreground/80 border border-border/50">
                  {persona.systemPrompt}
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end gap-2 border-t border-border/50 p-3 bg-muted/10 mt-auto">
                <Button variant="ghost" size="sm" onClick={() => openEditor(persona)} className="h-8 text-xs font-medium">
                  <Settings2 className="mr-2 h-3.5 w-3.5" /> Edit
                </Button>
                {persona.isDefault ? (
                  <Button variant="ghost" size="sm" disabled className="h-8 text-xs text-muted-foreground">
                    <Lock className="mr-2 h-3.5 w-3.5" /> Default
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(persona.id)} className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Editor Slide-over */}
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="sm:max-w-md w-full border-l border-border overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? "Edit Persona" : "Create Persona"}</SheetTitle>
            <SheetDescription>Configure how this AI should behave and respond.</SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Code Reviewer" />
            </div>

            <div className="space-y-2">
              <Label>Emoji</Label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-20 text-xl text-center" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description for the UI" />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <Label>Temperature: {temperature}</Label>
                <span className="text-xs text-muted-foreground">{temperature < 0.5 ? "Precise" : temperature > 1.2 ? "Creative" : "Balanced"}</span>
              </div>
              <Slider 
                value={[temperature]} 
                min={0} max={2} step={0.1}
                onValueChange={(v) => setTemperature(v[0])}
                className="my-4"
              />
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea 
                value={systemPrompt} 
                onChange={(e) => setSystemPrompt(e.target.value)} 
                className="h-[250px] font-mono text-sm resize-none"
                placeholder="You are a..."
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={createPersona.isPending || updatePersona.isPending}>
              {editId ? "Save Changes" : "Create Persona"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this persona. Conversations using this persona will revert to the default system prompt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
