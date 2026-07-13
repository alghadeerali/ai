import { useState } from "react";
import { 
  useListConversations,
  useRestoreConversation,
  useDeleteConversation,
  getListConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Archive as ArchiveIcon, 
  Trash2, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
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

export default function ArchivePage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: archivedData, isLoading: loadingArchived } = useListConversations({ archived: true, deleted: false });
  const { data: deletedData, isLoading: loadingDeleted } = useListConversations({ deleted: true });

  const restoreConv = useRestoreConversation();
  const deleteConv = useDeleteConversation();

  const handleRestore = (id: number) => {
    restoreConv.mutate({ id }, {
      onSuccess: () => {
        toast.success("Conversation restored");
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      }
    });
  };

  const handlePermanentDelete = () => {
    if (!deleteId) return;
    deleteConv.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast.success("Conversation permanently deleted");
        setDeleteId(null);
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      }
    });
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground text-sm bg-card rounded-lg border border-border mt-4">
      <ArchiveIcon className="h-10 w-10 mb-3 opacity-20" />
      {message}
    </div>
  );

  return (
    <div className="flex-1 p-8 bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ArchiveIcon className="h-8 w-8 text-primary" />
            Archive & Trash
          </h1>
          <p className="text-muted-foreground mt-1">Manage archived and deleted conversations.</p>
        </div>

        <Tabs defaultValue="archived" className="w-full">
          <TabsList className="grid w-[400px] grid-cols-2 mb-6">
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="deleted">Trash</TabsTrigger>
          </TabsList>
          
          <TabsContent value="archived">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead>Title</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingArchived ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : archivedData && archivedData.length > 0 ? (
                    archivedData.map(conv => (
                      <TableRow key={conv.id} className="border-border group">
                        <TableCell className="font-medium">{conv.title}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{conv.model.split('/').pop()}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{conv.messageCount}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRestore(conv.id)}
                            disabled={restoreConv.isPending}
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="p-0"><EmptyState message="No archived conversations" /></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="deleted">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-destructive/5 text-destructive border-b border-border flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4" /> Deleted conversations are kept for 30 days before permanent removal.
              </div>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead>Title</TableHead>
                    <TableHead>Deleted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDeleted ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : deletedData && deletedData.length > 0 ? (
                    deletedData.map(conv => (
                      <TableRow key={conv.id} className="border-border group">
                        <TableCell className="font-medium text-muted-foreground line-through decoration-muted-foreground/30">{conv.title}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {conv.deletedAt ? new Date(conv.deletedAt).toLocaleDateString() : 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleRestore(conv.id)}
                              disabled={restoreConv.isPending}
                            >
                              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Restore
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(conv.id)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Forever
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="p-0"><EmptyState message="Trash is empty" /></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The conversation and all its messages will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConv.isPending}
            >
              {deleteConv.isPending ? "Deleting..." : "Delete Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
