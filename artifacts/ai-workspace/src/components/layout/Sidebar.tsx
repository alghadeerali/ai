import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListConversations, useCreateConversation, useUpdateConversation, getListConversationsQueryKey } from "@workspace/api-client-react";
import { Menu, Plus, Search, MessageSquare, Archive, Settings, Activity, MoreHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchDialog } from "./SearchDialog";
import { toast } from "sonner";

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useListConversations({ archived: false, deleted: false });
  const createConv = useCreateConversation();
  const updateConv = useUpdateConversation();
  const go = (href: string) => { setLocation(href); onClose?.(); };
  const newConversation = () => createConv.mutate({ data: { title: "محادثة جديدة", model: "openai/gpt-4o" } }, { onSuccess: (c) => go(`/c/${c.id}`) });
  const del = (id: number) => updateConv.mutate({ id, data: { deleted: true } as any }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); toast.success("تم حذف المحادثة"); if (location === `/c/${id}`) go("/"); } });
  const item = (href: string, label: string, icon: any) => <button type="button" onClick={() => go(href)} className={`flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium ${location === href || (href !== '/' && location.startsWith(href)) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60'}`}>{icon}{label}</button>;
  return <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
    <div className="flex items-center justify-between border-b border-sidebar-border p-4">
      <div className="min-w-0"><div className="truncate text-lg font-bold tracking-tight text-sidebar-primary">alghadeer ai</div><div className="text-[11px] text-sidebar-foreground/60">Projects • Chats</div></div>
      {onClose && <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={onClose} aria-label="إغلاق"><X className="h-5 w-5" /></Button>}
    </div>
    <div className="p-3"><Button className="h-11 w-full justify-start gap-2 rounded-2xl" onClick={newConversation}><Plus className="h-4 w-4" /> محادثة جديدة</Button></div>
    <div className="px-3 pb-3"><Button variant="outline" className="h-11 w-full justify-start rounded-2xl bg-sidebar-accent/40 border-sidebar-border text-sidebar-foreground/80" onClick={() => go("/search")}><Search className="mr-2 h-4 w-4" /> بحث</Button></div>
    <ScrollArea className="flex-1 min-h-0 px-3">
      <div className="space-y-1 pb-3">
        {item('/', 'المحادثات', <MessageSquare className="h-4 w-4" />)}
        {item('/archive', 'الأرشيف', <Archive className="h-4 w-4" />)}
        {item('/usage', 'الاستخدام', <Activity className="h-4 w-4" />)}
        {item('/settings', 'الإعدادات', <Settings className="h-4 w-4" />)}
      </div>
      <div className="mt-5 space-y-2">
        <div className="px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Recent</div>
        {isLoading ? <div className="space-y-2 px-2"><Skeleton className="h-9 w-full bg-sidebar-accent/40" /><Skeleton className="h-9 w-full bg-sidebar-accent/40" /><Skeleton className="h-9 w-full bg-sidebar-accent/40" /></div> : conversations?.map((c) => <div key={c.id} className={`group flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${location === `/c/${c.id}` ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60'}`}>
          <Link href={`/c/${c.id}`} className="min-w-0 flex-1 truncate" onClick={onClose}>{c.title}</Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44"><DropdownMenuItem className="text-destructive" onClick={() => del(c.id)}><Trash2 className="mr-2 h-4 w-4" /> حذف المحادثة</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>)}
      </div>
    </ScrollArea>
  </div>
}

export function Sidebar() {
  return <aside className="hidden md:flex md:h-[100dvh] md:w-[292px] md:flex-col md:border-r md:border-border md:bg-sidebar"><SidebarContent /></aside>;
}

export function MobileSidebarTrigger({ onOpen }: { onOpen: () => void }) {
  return <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onOpen} aria-label="القائمة"><Menu className="h-5 w-5" /></Button>;
}

export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="left" className="w-[86vw] max-w-[330px] p-0 overflow-hidden"><SidebarContent onClose={() => onOpenChange(false)} /></SheetContent></Sheet>;
}

export function SearchDialogHost() { return <SearchDialog open={false} onOpenChange={() => {}} />; }
