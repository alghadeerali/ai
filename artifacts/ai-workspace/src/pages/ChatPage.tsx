import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetConversation, useListMessages, useSendMessage, useUpdateConversation, useCreateConversation, useArchiveConversation, useListModels, getListConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, UserSquare, Bot, Mic, Sparkles, Brain, ChevronDown, Paperclip, X, Plus, Menu, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSettings } from "@/providers/SettingsProvider";
import { Sidebar } from "@/components/layout/Sidebar";

function ReasoningBlock({ reasoning }: { reasoning: string }) { const [open, setOpen] = useState(false); return <div className="w-full overflow-hidden rounded-2xl border border-border bg-muted/30"><button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><Brain className="h-3.5 w-3.5 text-primary" />التفكير <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="border-t border-border/50 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{reasoning}</div>}</div> }

export default function ChatPage() {
  const [match, params] = useRoute("/c/:id");
  const [, setLocation] = useLocation();
  const id = match && params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();
  const { direction, enterToSend, defaultModel, tempChatEnabled, setTempChatEnabled } = useSettings();
  const [input, setInput] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [showActions, setShowActions] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: conversation, isLoading: loadingConv } = useGetConversation(id!, { query: { enabled: !!id } });
  const { data: messages, isLoading: loadingMessages } = useListMessages(id!, { query: { enabled: !!id } });
  const { data: models } = useListModels();
  const sendMessage = useSendMessage();
  const updateConv = useUpdateConversation();
  const createConv = useCreateConversation();
  const archiveConv = useArchiveConversation();
  const visibleModels = models ?? [];
  useEffect(() => { if (conversation) { setEditedTitle(conversation.title); setSelectedModel(conversation.model); } }, [conversation]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages?.length]);
  const handleSaveTitle = () => { if (!id || !editedTitle.trim()) return; updateConv.mutate({ id, data: { title: editedTitle.trim() } }, { onSuccess: () => {} }); };
  const handleSend = async () => { if (!input.trim() || sendMessage.isPending) return; const content = input; setInput(""); if (!id) { try { const conv = await createConv.mutateAsync({ data: { title: content.slice(0, 40), model: selectedModel } }); queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); setLocation(`/c/${conv.id}`); sendMessage.mutate({ id: conv.id, data: { content } as any }); } catch { setInput(content); toast.error("تعذّر إنشاء المحادثة"); } return; } sendMessage.mutate({ id, data: { content } as any }); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } else if (e.key === 'Enter' && enterToSend && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleAttachClick = () => fileInputRef.current?.click();
  const removeAttachedFile = (i: number) => setAttachedFiles((f) => f.filter((_, idx) => idx !== i));
  const toggleRecording = () => toast.message("إدخال صوتي سيُضاف لاحقًا");
  const handleDeleteConversation = () => { if (!id) return; updateConv.mutate({ id, data: { deleted: true } as any }, { onSuccess: () => { toast.success("تم حذف المحادثة"); queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); setLocation('/'); } }); };
  const modelsToShow = visibleModels;
  return <div className="flex min-h-[100dvh] w-full overflow-hidden bg-background text-foreground">
    <Sidebar />
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="md:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background px-3">
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setShowDrawer(true)}><Menu className="h-5 w-5" /></Button>
        <div className="min-w-0 flex-1 px-2 text-center"><div className="truncate text-base font-bold tracking-tight">{id ? (conversation?.title || 'محادثة جديدة') : 'محادثة جديدة'}</div><div className="truncate text-[11px] text-muted-foreground">{tempChatEnabled ? 'مؤقتة' : ''}</div></div>
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setShowActions((v) => !v)}><Plus className="h-5 w-5" /></Button>
      </div>
      {showDrawer && <div className="fixed inset-0 z-40 md:hidden"><button className="absolute inset-0 bg-black/35" onClick={() => setShowDrawer(false)} /><div className="absolute inset-y-0 left-0 w-[86vw] max-w-[330px] bg-sidebar shadow-2xl"><Sidebar /></div></div>}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6" dir={direction === 'rtl' ? 'rtl' : 'ltr'}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-4">
          {!messages?.length && !sendMessage.isPending && <div className="flex flex-col items-center justify-center py-14 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Sparkles className="h-8 w-8" /></div><h1 className="mb-2 text-2xl font-bold tracking-tight">كيف أقدر أساعدك اليوم؟</h1><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">اكتب رسالتك بالأسفل. تقدر تبدّل النموذج أو تستخدم المحادثة المؤقتة من الشريط السفلي.</p></div>}
          {loadingConv || loadingMessages ? <div className="space-y-4"><Skeleton className="h-20 w-3/4 ml-auto" /><Skeleton className="h-24 w-3/4" /><Skeleton className="h-20 w-2/3 ml-auto" /></div> : messages?.map((msg: any) => { const isUser = msg.role === 'user'; return <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`} dir="auto"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isUser ? 'bg-primary/20 text-primary' : 'border border-border bg-secondary text-secondary-foreground'}`}>{isUser ? <UserSquare className="h-5 w-5" /> : <Bot className="h-5 w-5" />}</div><div className={`flex min-w-0 flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[88%]`}><div className="rounded-2xl border border-border bg-card px-4 py-3 text-[15px] leading-relaxed">{!isUser && msg.reasoning && <ReasoningBlock reasoning={msg.reasoning} />}<ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div></div></div> })}
        </div>
      </div>
      <div className="border-t border-border bg-background px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <Button type="button" variant="outline" size="sm" className={`h-9 shrink-0 rounded-full px-3 text-xs ${tempChatEnabled ? 'border-primary bg-primary/10 text-primary' : ''}`} onClick={() => setTempChatEnabled(!tempChatEnabled)}><Sparkles className="mr-1 h-4 w-4" />مؤقتة</Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={handleAttachClick}><Paperclip className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={toggleRecording}><Mic className="h-4 w-4" /></Button>
            <Select value={selectedModel} onValueChange={setSelectedModel}><SelectTrigger className="h-9 w-[150px] shrink-0 rounded-full bg-muted/40 px-3 text-xs"><SelectValue placeholder="النموذج" /></SelectTrigger><SelectContent>{modelsToShow.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
            <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 rounded-full px-3 text-xs" onClick={() => setShowActions((v) => !v)}><Brain className="mr-1 h-4 w-4" />تفكير</Button>
          </div>
          <div className="rounded-[1.5rem] border border-input bg-card shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={enterToSend ? 'اكتب رسالتك...' : 'اكتب رسالتك... (Ctrl/Cmd+Enter للإرسال)'} className="min-h-[112px] w-full resize-none border-0 bg-transparent px-4 py-4 text-[15px] leading-6 focus-visible:ring-0" dir="auto" />
            <div className="flex items-center justify-between gap-2 px-3 pb-3"><div className="flex items-center gap-2"><Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={handleAttachClick}><Paperclip className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={toggleRecording}><Mic className="h-4 w-4" /></Button></div><Button type="button" onClick={handleSend} disabled={sendMessage.isPending || !input.trim()} className="h-11 w-11 rounded-full p-0"><Send className="h-4 w-4" /></Button></div>
          </div>
          {showActions && <div className="rounded-2xl border border-border bg-card p-3 text-sm md:hidden"><DropdownMenu open onOpenChange={setShowActions}><DropdownMenuTrigger asChild><button className="hidden" /></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { setShowActions(false); toast.message('استخدم زر تفكير في الشريط السفلي'); }}><Brain className="mr-2 h-4 w-4" />التفكير العميق</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { handleAttachClick(); setShowActions(false); }}><Paperclip className="mr-2 h-4 w-4" />مرفقات</DropdownMenuItem><DropdownMenuItem onClick={() => { handleDeleteConversation(); setShowActions(false); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />حذف المحادثة</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>}
          {attachedFiles.length > 0 && <div className="flex flex-wrap gap-2">{attachedFiles.map((f, i) => <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs"><span className="max-w-[140px] truncate">{f.name}</span><button type="button" onClick={() => removeAttachedFile(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button></div>)}</div>}
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setAttachedFiles((s) => [...s, file]); }} />
        </div>
      </div>
    </main>
  </div>
}
