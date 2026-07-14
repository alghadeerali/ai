import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetConversation, 
  useListMessages, 
  useSendMessage, 
  useUpdateConversation,
  useCreateConversation,
  useArchiveConversation,
  useListModels,
  useListPersonas,
  getGetConversationQueryKey,
  getListMessagesQueryKey,
  getListConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Send, 
  MoreVertical, 
  Edit2, 
  Download, 
  Archive, 
  Cpu,
  UserSquare,
  Copy,
  Check,
  Bot,
  Mic,
  Sparkles,
  Brain,
  ChevronDown,
  Paperclip,
  X,
  Plus,
  Image as ImageIcon
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSettings } from "@/providers/SettingsProvider";

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full rounded-xl border border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Brain className="h-3.5 w-3.5 text-primary" />
        <span>سلسلة التفكير</span>
        <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap border-t border-border/50" dir="auto">
          {reasoning}
        </div>
      )}
    </div>
  );
}

function SidebarDesktop() { return <></>; }
function SidebarMobile({ onClose }: { onClose: () => void }) { return <></>; }

export default function ChatPage() {
  const [match, params] = useRoute("/c/:id");
  const [, setLocation] = useLocation();
  const id = match && params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();
  const { direction, enterToSend, favoriteModels, defaultModel, tempChatEnabled, setTempChatEnabled } = useSettings();

  const [input, setInput] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showComposerActions, setShowComposerActions] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const { data: conversation, isLoading: loadingConv } = useGetConversation(id!, { query: { enabled: !!id } });
  const { data: messages, isLoading: loadingMessages } = useListMessages(id!, { query: { enabled: !!id } });
  const { data: models } = useListModels();
  const { data: personas } = useListPersonas();

  const sendMessage = useSendMessage();
  const updateConv = useUpdateConversation();
  const createConv = useCreateConversation();
  const archiveConv = useArchiveConversation();

  const visibleModels = (() => {
    if (!models) return [];
    if (!favoriteModels.length) return models;
    const favs = models.filter((m) => favoriteModels.includes(m.id));
    const current = models.find((m) => m.id === selectedModel);
    if (current && !favs.some((m) => m.id === current.id)) return [current, ...favs];
    return favs;
  })();

  const imageModels = (models ?? []).filter((m: any) => {
    const t = `${m.id} ${m.name} ${m.description ?? ""}`.toLowerCase();
    return t.includes("image") || t.includes("vision") || t.includes("dall-e") || t.includes("dalle") || t.includes("flux") || t.includes("stable-diffusion") || t.includes("midjourney") || t.includes("imagen");
  });

  useEffect(() => {
    if (conversation && !isEditingTitle) {
      setEditedTitle(conversation.title);
      setSelectedModel(conversation.model);
      setSelectedPersonaId(conversation.personaId ?? null);
    }
  }, [conversation, isEditingTitle]);

  useEffect(() => { if (!id) setSelectedModel(defaultModel); }, [id, defaultModel]);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sendMessage.isPending]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const dispatchMessage = (conversationId: number, content: string) => {
    sendMessage.mutate({ id: conversationId, data: { content, model: selectedModel, thinking } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
        queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(conversationId) });
      },
      onError: (err) => {
        toast.error("تعذّر إرسال الرسالة");
        console.error(err);
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || sendMessage.isPending) return;
    const content = input;
    const generatedTitle = content.substring(0, 40) + (content.length > 40 ? "..." : "");
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (!id) {
      try {
        const conv = await createConv.mutateAsync({ data: { title: generatedTitle, model: selectedModel, personaId: selectedPersonaId } });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation(`/c/${conv.id}`);
        dispatchMessage(conv.id, content);
      } catch (err) {
        toast.error("تعذّر إنشاء المحادثة");
        console.error(err);
        setInput(content);
      }
      return;
    }

    if (conversation?.title === "New Conversation" && messages?.length === 0) {
      updateConv.mutate({ id, data: { title: generatedTitle } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }) });
    }

    dispatchMessage(id, content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); return; }
    if (e.key === "Enter" && enterToSend && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAttachClick = () => fileInputRef.current?.click();
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) { setAttachedFiles((prev) => [...prev, ...files]); toast.success(`تمت إضافة ${files.length} ملف`); }
    e.target.value = "";
  };
  const removeAttachedFile = (index: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("المتصفح لا يدعم الإدخال الصوتي. جرّب Chrome."); return; }
    if (isRecording) { recognitionRef.current?.stop(); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = direction === "ltr" ? "en-US" : "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join(" ");
      setInput((prev) => (prev ? prev + " " : "") + transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  const handleExportMarkdown = () => {
    if (!messages?.length) { toast.error("لا توجد رسائل للتصدير"); return; }
const md = messages
      .map((m) => `## ${m.role === "user" ? "أنت" : "المساعد"}\n\n${m.content}`)
      .join("\n\n---\n\n");
const blob = new Blob([`# ${conversation?.title ?? "محادثة"}\n\n${md}`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${conversation?.title ?? "conversation"}.md`; a.click(); URL.revokeObjectURL(url);
  };

  const handleSaveTitle = () => {
    if (!id || !editedTitle.trim() || editedTitle === conversation?.title) { setIsEditingTitle(false); return; }
    updateConv.mutate({ id, data: { title: editedTitle.trim() } }, {
      onSuccess: (data) => {
        setIsEditingTitle(false);
        queryClient.setQueryData(getGetConversationQueryKey(id), data);
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        toast.success("Title updated");
      }
    });
  };

  const handleModelChange = (val: string) => {
    setSelectedModel(val);
    if (id) updateConv.mutate({ id, data: { model: val } }, { onSuccess: (data) => { queryClient.setQueryData(getGetConversationQueryKey(id), data); queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); } });
  };

  const handlePersonaChange = (val: string) => {
    const personaId = val === "none" ? null : parseInt(val, 10);
    if (id) updateConv.mutate({ id, data: { personaId } }, { onSuccess: (data) => queryClient.setQueryData(getGetConversationQueryKey(id), data) });
  };

  const CodeBlock = ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const [copied, setCopied] = useState(false);
    const normalized = String(children).endsWith('\n') ? String(children).slice(0, -1) : String(children);
    const onCopy = () => { navigator.clipboard.writeText(normalized); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (!inline && match) return (<div className="relative group rounded-md overflow-hidden my-4 border border-border"><div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground font-mono"><span>{match[1]}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</Button></div><SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, background: "transparent" }} {...props}>{normalized}</SyntaxHighlighter></div>);
    return <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>{children}</code>;
  };

  if (id && loadingConv) {
    return <div className="flex-1 p-6 space-y-4"><Skeleton className="h-10 w-1/3" /><div className="space-y-4 pt-10"><Skeleton className="h-24 w-3/4 ml-auto" /><Skeleton className="h-32 w-3/4" /></div></div>;
  }

  return (
    <div className="flex h-full min-h-[100dvh] flex-col bg-background overflow-hidden">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <div className="md:hidden w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{id ? (conversation?.title || "محادثة جديدة") : "محادثة جديدة"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{tempChatEnabled ? "مؤقتة" : ""}</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">{/* desktop controls kept in current UI */}</div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 scroll-smooth" dir={direction === "rtl" ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-3xl space-y-6 pb-4">
          {!messages?.length && !sendMessage.isPending && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm"><Sparkles className="h-8 w-8" /></div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight">كيف أقدر أساعدك اليوم؟</h1>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">اكتب رسالتك بالأسفل. تقدر تبدّل النموذج أو تفعّل المحادثة المؤقتة من زرها في الأسفل.</p>
            </div>
          )}
          {messages?.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`} dir="auto">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isUser ? 'bg-primary/20 text-primary' : 'border border-border bg-secondary text-secondary-foreground'}`}>{isUser ? <UserSquare className="h-5 w-5" /> : <Bot className="h-5 w-5" />}</div>
                <div className={`flex min-w-0 flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[88%]`}>
                  {!isUser && msg.reasoning && <ReasoningBlock reasoning={msg.reasoning} />}
                  <div className={`prose prose-sm max-w-none break-words rounded-2xl px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border bg-background px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button type="button" variant="outline" size="sm" className={`h-9 rounded-full px-3 text-xs ${tempChatEnabled ? 'border-primary bg-primary/10 text-primary' : 'bg-background'}`} onClick={() => setTempChatEnabled(!tempChatEnabled)} aria-pressed={tempChatEnabled} aria-label="المحادثة المؤقتة"><Sparkles className="mr-1 h-4 w-4" />مؤقتة</Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={handleAttachClick} aria-label="المرفقات"><Paperclip className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={toggleRecording} aria-label="إدخال صوتي"><Mic className="h-4 w-4" /></Button>
            <div className="flex-1" />
            <Select value={selectedModel} onValueChange={handleModelChange}><SelectTrigger className="h-9 w-[150px] rounded-full bg-muted/40 px-3 text-xs"><SelectValue placeholder="النموذج" /></SelectTrigger><SelectContent>{visibleModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="relative rounded-[1.5rem] border border-input bg-card shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <Textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKeyDown} placeholder={enterToSend ? 'اكتب رسالتك...' : 'اكتب رسالتك... (Ctrl/Cmd+Enter للإرسال)'} className="min-h-[110px] w-full resize-none border-0 bg-transparent px-4 py-4 text-[15px] leading-6 focus-visible:ring-0" dir="auto" />
            <div className="flex items-center justify-between gap-2 px-3 pb-3">
              <div className="flex gap-2" />
              <Button type="button" onClick={handleSend} disabled={sendMessage.isPending || !input.trim()} className="h-11 w-11 rounded-full p-0"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
          {attachedFiles.length > 0 && <div className="flex flex-wrap gap-2">{attachedFiles.map((f, i) => <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs"><span className="max-w-[140px] truncate">{f.name}</span><button type="button" onClick={() => removeAttachedFile(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button></div>)}</div>}
        </div>
      </div>
    </div>
  );
}
