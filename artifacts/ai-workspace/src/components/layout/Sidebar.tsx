import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useListProjects,
  useListConversations,
  useCreateConversation,
  useUpdateConversation
} from "@workspace/api-client-react";
import {
  MessageSquare,
  Settings,
  Search,
  Plus,
  Archive,
  Menu,
  Activity,
  Users,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchDialog } from "./SearchDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { data: projects, isLoading: loadingProjects } = useListProjects();
  const { data: conversations, isLoading: loadingConversations } = useListConversations({ archived: false, deleted: false });
  const createConv = useCreateConversation();
  const updateConv = useUpdateConversation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNewConversation = (projectId?: number) => {
    createConv.mutate(
      { data: { title: "New Conversation", model: "openai/gpt-4o", projectId } },
      {
        onSuccess: (conv) => {
          setLocation(`/c/${conv.id}`);
          setIsMobileOpen(false);
        },
      }
    );
  };

  const handleDeleteConversation = (id: number) => {
    updateConv.mutate(
      { id, data: { deleted: true } as any },
      {
        onSuccess: () => {
          toast.success("تم حذف المحادثة");
          if (location === `/c/${id}`) setLocation("/");
        },
        onError: () => toast.error("تعذر حذف المحادثة"),
      }
    );
  };

  const ConversationRow = ({ conv, nested = false }: any) => null
  const ConversationItem = ({ conv, nested = false }: any) => (
    <div className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${location === `/c/${conv.id}` ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`}>
      {!nested && <MessageSquare className="h-3.5 w-3.5 opacity-50 shrink-0" />}
      <Link href={`/c/${conv.id}`} className="flex-1 truncate min-w-0" onClick={() => setIsMobileOpen(false)}>
        {conv.title}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteConversation(conv.id)}>
            <Trash2 className="mr-2 h-4 w-4" /> حذف المحادثة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const NavContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setIsMobileOpen(false); }}>
      <div className="p-4 pb-2">
        <h2 className="text-lg font-bold tracking-tight text-sidebar-primary">AI Workspace</h2>
      </div>

      <div className="px-3 pb-2">
        <Button className="w-full justify-start gap-2 rounded-xl" onClick={() => handleNewConversation()}>
          <Plus className="h-4 w-4" />
          محادثة جديدة
        </Button>
      </div>

      <div className="px-3 pb-2">
        <Button variant="outline" className="w-full justify-start text-muted-foreground bg-sidebar-accent/50 border-sidebar-border rounded-xl" onClick={() => setSearchOpen(true)}>
          <Search className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100"><span className="text-xs">⌘</span>K</kbd>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Link href="/" className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${location === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`}><MessageSquare className="h-4 w-4" />Chat</Link>
            <Link href="/personas" className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${location.startsWith("/personas") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`}><Users className="h-4 w-4" />Personas</Link>
            <Link href="/usage" className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${location.startsWith("/usage") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`}><Activity className="h-4 w-4" />Usage</Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Projects</h3></div>
            {loadingProjects || loadingConversations ? (
              <div className="space-y-2 px-2"><Skeleton className="h-8 w-full bg-sidebar-accent/50" /><Skeleton className="h-8 w-full bg-sidebar-accent/50" /><Skeleton className="h-8 w-full bg-sidebar-accent/50" /></div>
            ) : (
              <div className="space-y-1">
                {conversations?.filter((c) => !c.projectId).map((conv) => <ConversationItem key={conv.id} conv={conv} />)}
                {projects?.map((project) => {
                  const projectConvs = conversations?.filter((c) => c.projectId === project.id) || [];
                  return (
                    <div key={project.id} className="pt-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-sidebar-foreground group">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || 'var(--color-primary)' }} />
                        <span className="flex-1 truncate">{project.name}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleNewConversation(project.id)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <div className="space-y-0.5 ml-4 border-l border-sidebar-border/50 pl-2">
                        {projectConvs.map((conv) => <ConversationItem key={conv.id} conv={conv} nested />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link href="/archive" className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${location.startsWith('/archive') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70'}`}><Archive className="h-4 w-4" />Archive</Link>
        <Link href="/settings" className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${location.startsWith('/settings') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70'}`}><Settings className="h-4 w-4" />Settings</Link>
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-3 border-b bg-background overflow-x-hidden max-w-[100vw] sticky top-0 z-20">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[82vw] max-w-[300px] border-sidebar-border">
            <NavContent />
          </SheetContent>
        </Sheet>
        <span className="font-bold tracking-tight text-primary text-base">AI Workspace</span>
        <div className="w-9" />
      </div>

      <div className="hidden md:flex w-64 border-r border-sidebar-border bg-sidebar h-[100dvh] flex-col shrink-0 overflow-x-hidden">
        <NavContent />
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
