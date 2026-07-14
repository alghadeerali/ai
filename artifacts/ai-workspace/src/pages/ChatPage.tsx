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
  X
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
        <div
          className="px-3 pb-3 pt-1 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap border-t border-border/50"
          dir="auto"
        >
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
  const { direction, enterToSend, favoriteModels, defaultModel } = useSettings();

  const [input, setInput] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Queries
  const { data: conversation, isLoading: loadingConv } = useGetConversation(id!, { 
    query: { enabled: !!id } 
  });
  
  const { data: messages, isLoading: loadingMessages } = useListMessages(id!, {
    query: { enabled: !!id }
  });

  const { data: models } = useListModels();
  const { data: personas } = useListPersonas();

  // Mutations
  const sendMessage = useSendMessage();
  const updateConv = useUpdateConversation();
  const createConv = useCreateConversation();
  const archiveConv = useArchiveConversation();

  // Models shown in the picker: favorites only (if any set), always include current
  const visibleModels = (() => {
    if (!models) return [];
    if (!favoriteModels.length) return models;
    const favs = models.filter((m) => favoriteModels.includes(m.id));
    const current = models.find((m) => m.id === selectedModel);
    if (current && !favs.some((m) => m.id === current.id)) return [current, ...favs];
    return favs;
  })();

  useEffect(() => {
    if (conversation && !isEditingTitle) {
      setEditedTitle(conversation.title);
      setSelectedModel(conversation.model);
      setSelectedPersonaId(conversation.personaId ?? null);
    }
  }, [conversation, isEditingTitle]);

  // On the compose (home) screen keep the model in sync with the default setting
  useEffect(() => {
    if (!id) setSelectedModel(defaultModel);
  }, [id, defaultModel]);

  // Clean up any active speech recognition on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMessage.isPending]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const dispatchMessage = (conversationId: number, content: string) => {
    sendMessage.mutate({
      id: conversationId,
      data: { content, model: selectedModel, thinking }
    }, {
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

    // Compose screen: create the conversation first, then send.
    if (!id) {
      try {
        const conv = await createConv.mutateAsync({
          data: { title: generatedTitle, model: selectedModel, personaId: selectedPersonaId },
        });
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

    // Auto-generate title for "New Conversation" on first message
    if (conversation?.title === "New Conversation" && messages?.length === 0) {
      updateConv.mutate({
        id,
        data: { title: generatedTitle }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        }
      });
    }

    dispatchMessage(id, content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter always sends
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
    // Plain Enter sends only when "enter to send" is on and Shift isn't held
    if (e.key === "Enter" && enterToSend && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      setAttachedFiles((prev) => [...prev, ...files]);
      toast.success(`تمت إضافة ${files.length} ملف`);
    }
    e.target.value = "";
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("المتصفح لا يدعم الإدخال الصوتي. جرّب Chrome.");
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = direction === "ltr" ? "en-US" : "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setInput((prev) => (prev ? prev + " " : "") + transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  const handleExportMarkdown = () => {
    if (!messages?.length) {
      toast.error("لا توجد رسائل للتصدير");
      return;
    }
    const md = messages
      .map((m) => `## ${m.role === "user" ? "أنت" : "المساعد"}\n\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# ${conversation?.title ?? "محادثة"}\n\n${md}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conversation?.title ?? "conversation"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTitle = () => {
    if (!id || !editedTitle.trim() || editedTitle === conversation?.title) {
      setIsEditingTitle(false);
      return;
    }

    updateConv.mutate({
      id,
      data: { title: editedTitle.trim() }
    }, {
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
    if (id) {
      updateConv.mutate({ id, data: { model: val } }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetConversationQueryKey(id), data);
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        }
      });
    }
  };

  const handlePersonaChange = (val: string) => {
    const personaId = val === "none" ? null : parseInt(val, 10);
    if (id) {
      updateConv.mutate({ id, data: { personaId } }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetConversationQueryKey(id), data);
        }
      });
    }
  };

  const CodeBlock = ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const [copied, setCopied] = useState(false);

    const onCopy = () => {
      navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (!inline && match) {
      return (
        <div className="relative group rounded-md overflow-hidden my-4 border border-border">
          <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground font-mono">
            <span>{match[1]}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    }
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
        {children}
      </code>
    );
  };

  if (id && loadingConv) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="space-y-4 pt-10">
          <Skeleton className="h-24 w-3/4 ml-auto" />
          <Skeleton className="h-32 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Topbar */}
      <header className="flex-none h-14 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
          {!id ? (
            <div className="font-semibold truncate px-2 py-1 -ml-2 text-muted-foreground">
              محادثة جديدة
            </div>
          ) : isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              className="bg-background border border-input rounded px-2 py-1 text-sm font-medium w-full max-w-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          ) : (
            <div 
              className="font-semibold truncate cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors -ml-2"
              onClick={() => setIsEditingTitle(true)}
            >
              {conversation?.title}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {models && (
            <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/30 border-none shadow-none">
                <div className="flex items-center gap-2 truncate">
                  <Cpu className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate">{models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {visibleModels.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{m.name}</span>
                      {m.isFree && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Free</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {personas && personas.length > 0 && (
            <Select 
              value={selectedPersonaId?.toString() || "none"} 
              onValueChange={handlePersonaChange}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/30 border-none shadow-none">
                <div className="flex items-center gap-2 truncate">
                  <UserSquare className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {selectedPersonaId 
                      ? personas.find(p => p.id === selectedPersonaId)?.name 
                      : "الشخصية الافتراضية"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default Persona</SelectItem>
                {personas.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.emoji && <span className="mr-2">{p.emoji}</span>}
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                  <Edit2 className="mr-2 h-4 w-4" /> إعادة تسمية
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportMarkdown}>
                  <Download className="mr-2 h-4 w-4" /> تصدير Markdown
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    archiveConv.mutate(
                      { id, data: { archived: true } },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
                          toast.success("تمت الأرشفة");
                          setLocation("/");
                        },
                      },
                    );
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" /> أرشفة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
        dir={direction === "rtl" ? "rtl" : "ltr"}
      >
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {!messages?.length && !sendMessage.isPending && (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm border border-primary/20">
                <Sparkles className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">كيف أقدر أساعدك اليوم؟</h1>
              <p className="text-muted-foreground max-w-md">
                اكتب رسالتك بالأسفل للبدء. تقدر تبدّل النموذج والشخصية من الأعلى في أي وقت.
              </p>
            </div>
          )}
          {messages?.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                dir="auto"
              >
                <div className={`w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center ${isUser ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground border border-border'}`}>
                  {isUser ? <UserSquare className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                
                <div className={`flex flex-col gap-1 max-w-[85%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                  {!isUser && msg.reasoning && <ReasoningBlock reasoning={msg.reasoning} />}
                  <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    isUser 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-card border border-border rounded-tl-sm'
                  }`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{ code: CodeBlock }}
                      className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'dark:prose-invert'} 
                        prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0`}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  
                  {!isUser && (
                    <div className="flex items-center gap-3 px-1 text-[11px] text-muted-foreground/70 font-medium">
                      <span>{models?.find(m => m.id === msg.model)?.name || msg.model}</span>
                      {msg.costUsd !== null && msg.costUsd !== undefined && (
                        <span>${msg.costUsd.toFixed(5)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {sendMessage.isPending && (
            <div className="flex gap-4 flex-row" dir="auto">
              <div className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center bg-secondary text-secondary-foreground border border-border">
                <Bot className="h-5 w-5" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                <div className="flex gap-1.5 items-center h-5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="flex-none p-4 bg-background/80 backdrop-blur border-t border-border">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        <div className="max-w-4xl mx-auto space-y-2">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate max-w-[140px]">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachedFile(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        <div className="relative rounded-xl border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all overflow-hidden">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              enterToSend
                ? "اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
                : "اكتب رسالتك... (Ctrl/Cmd+Enter للإرسال)"
            }
            className="min-h-[60px] max-h-[400px] resize-none border-0 focus-visible:ring-0 text-[15px] p-4 pr-24 bg-transparent"
            dir="auto"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleAttachClick}
              title="إرفاق ملف"
              className="h-8 w-8 rounded-lg text-muted-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setThinking((v) => !v)}
              title="وضع التفكير (للنماذج التي تدعم الاستدلال)"
              className={`h-8 w-8 rounded-lg ${thinking ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            >
              <Brain className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={toggleRecording}
              title="إدخال صوتي"
              className={`h-8 w-8 rounded-lg ${isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={!input.trim() || sendMessage.isPending}
              className="h-8 w-8 rounded-lg shadow-sm"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>
        </div>
        <div className="max-w-4xl mx-auto text-center mt-2">
          <p className="text-[10px] text-muted-foreground/60">
            قد يرتكب المساعد أخطاء. تحقّق من المعلومات المهمة.
          </p>
        </div>
      </div>
    </div>
  );
}
