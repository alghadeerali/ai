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
    <div className="flex flex-col h-full bg-background relative">
      <header className="flex-none h-14 border-b border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center justify-between px-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="md:hidden w-8" />
          <div className="flex flex-col min-w-0">
            <div className="text-xs text-muted-foreground leading-none">{tempChatEnabled && !id ? "محادثة مؤقتة" : ""}</div>
            <div className="flex items-center gap-2 min-w-0">
              {isEditingTitle && id ? (
                <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} onBlur={handleSaveTitle} onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()} className="bg-background border border-input rounded px-2 py-1 text-sm font-medium w-full max-w-[16rem] focus:outline-none focus:ring-1 focus:ring-ring" autoFocus />
              ) : (
                <button type="button" onClick={() => !id ? null : setIsEditingTitle(true)} className="text-left min-w-0 truncate font-semibold text-foreground hover:text-primary transition-colors">
                  {id ? (conversation?.title || "محادثة جديدة") : "محادثة جديدة"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger className="w-[140px] sm:w-[200px] h-9 rounded-full bg-muted/40 border-border/70 shadow-none text-xs sm:text-sm px-3">
              <div className="flex items-center gap-2 truncate">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{models?.find(m => m.id === selectedModel)?.name || selectedModel}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {visibleModels.map(m => (<SelectItem key={m.id} value={m.id}><div className="flex items-center justify-between w-full gap-4"><span>{m.name}</span>{m.isFree && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Free</span>}</div></SelectItem>))}
            </SelectContent>
          </Select>

          {personas && personas.length > 0 && (
            <Select value={selectedPersonaId?.toString() || "none"} onValueChange={handlePersonaChange}>
              <SelectTrigger className="hidden sm:flex w-[140px] h-9 rounded-full bg-muted/40 border-border/70 shadow-none text-xs sm:text-sm px-3">
                <div className="flex items-center gap-2 truncate">
                  <UserSquare className="h-3.5 w-3.5" />
                  <span className="truncate">{selectedPersonaId ? personas.find(p => p.id === selectedPersonaId)?.name : "الشخصية الافتراضية"}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default Persona</SelectItem>
                {personas.map(p => (<SelectItem key={p.id} value={p.id.toString()}>{p.emoji && <span className="mr-2">{p.emoji}</span>}{p.name}</SelectItem>))}
              </SelectContent>
            </Select>
          )}

          <Button type="button" variant="outline" className={`h-9 rounded-full px-3 text-xs sm:text-sm border-border ${tempChatEnabled ? 'bg-black text-white border-black dark:bg-primary dark:text-primary-foreground dark:border-primary' : 'bg-background text-foreground'}`} onClick={() => setTempChatEnabled(!tempChatEnabled)} aria-pressed={tempChatEnabled} aria-label="المحادثة المؤقتة">
            <Sparkles className="h-4 w-4 mr-1" />
            مؤقتة
          </Button>

          {id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditingTitle(true)}><Edit2 className="mr-2 h-4 w-4" /> إعادة تسمية</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportMarkdown}><Download className="mr-2 h-4 w-4" /> تصدير Markdown</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { archiveConv.mutate({ id, data: { archived: true } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); toast.success("تمت الأرشفة"); setLocation("/"); }, }); }}><Archive className="mr-2 h-4 w-4" /> أرشفة</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth" dir={direction === "rtl" ? "rtl" : "ltr"}>
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {!messages?.length && !sendMessage.isPending && (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm border border-primary/20"><Sparkles className="h-8 w-8" /></div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">كيف أقدر أساعدك اليوم؟</h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">اكتب رسالتك بالأسفل للبدء. تقدر تبدّل النموذج والشخصية من الأعلى في أي وقت.</p>
            </div>
          )}
          {messages?.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`} dir="auto">
                <div className={`w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center ${isUser ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground border border-border'}`}>{isUser ? <UserSquare className="h-5 w-5" /> : <Bot className="h-5 w-5" />}</div>
                <div className={`flex flex-col gap-1 max-w-[85%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                  {!isUser && msg.reasoning && <ReasoningBlock reasoning={msg.reasoning} />}
                  <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }} className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'dark:prose-invert'} prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0`}>{msg.content}</ReactMarkdown>
                  </div>
                  {!isUser && (<div className="flex items-center gap-3 px-1 text-[11px] text-muted-foreground/70 font-medium"><span>{models?.find(m => m.id === msg.model)?.name || msg.model}</span>{msg.costUsd !== null && msg.costUsd !== undefined && (<span>${msg.costUsd.toFixed(5)}</span>)}</div>)}
                </div>
              </div>
            );
          })}
          {sendMessage.isPending && (<div className="flex gap-4 flex-row" dir="auto"><div className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center bg-secondary text-secondary-foreground border border-border"><Bot className="h-5 w-5" /></div><div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm"><div className="flex gap-1.5 items-center h-5"><div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" /></div></div></div>)}
        </div>
      </div>

      <div className="flex-none p-4 bg-background/90 backdrop-blur border-t border-border">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
        <div className="max-w-4xl mx-auto space-y-3">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-2 bg-muted/50 border border-border rounded-full px-3 py-1.5 text-xs">
                  <span className="truncate max-w-[140px]">{f.name}</span>
                  <button type="button" onClick={() => removeAttachedFile(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="relative w-full rounded-[1.6rem] border border-input bg-card shadow-[0_10px_30px_rgba(0,0,0,0.06)] focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all overflow-hidden max-w-full">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={enterToSend ? "اكتب رسالتك..." : "اكتب رسالتك... (Ctrl/Cmd+Enter للإرسال)"}
              className="block w-full min-h-[68px] max-h-[220px] resize-none border-0 focus-visible:ring-0 text-[15px] px-4 py-4 pr-32 sm:pr-40 pl-24 sm:pl-28 bg-transparent leading-6 break-words whitespace-pre-wrap"
              dir="auto"
            />
            <div className="absolute left-3 bottom-3 flex items-center gap-1 z-10 shrink-0">
              <DropdownMenu open={showComposerActions} onOpenChange={setShowComposerActions}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground bg-muted/30" aria-label="المزيد">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56 rounded-2xl p-2">
                  <DropdownMenuItem onClick={() => toast.info(tempChatEnabled ? "المحادثة المؤقتة مفعلة" : "المحادثة المؤقتة غير مفعلة") }>
                    <Sparkles className="mr-2 h-4 w-4" /> المحادثة المؤقتة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setThinking((v) => !v)}>
                    <Brain className="mr-2 h-4 w-4" /> التفكير العميق {thinking ? "✓" : ""}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info(`نموذج الصور: ${imageModels.length || 0}`)}>
                    <ImageIcon className="mr-2 h-4 w-4" /> إنشاء صورة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAttachClick}>
                    <Paperclip className="mr-2 h-4 w-4" /> المرفقات
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" size="icon" variant="ghost" onClick={toggleRecording} title="إدخال صوتي" className={`h-9 w-9 rounded-full ${isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
                <Mic className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={handleSend} disabled={!input.trim() || sendMessage.isPending} className="h-9 w-9 rounded-full shadow-sm">
                <Send className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto text-center mt-2">
            <p className="text-[10px] text-muted-foreground/60">قد يرتكب المساعد أخطاء. تحقّق من المعلومات المهمة.</p>
          </div>
        </div>
      </div>
    </div>
  );
}