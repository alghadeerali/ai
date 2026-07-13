import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSearch } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MessageSquare, FolderKanban, Search as SearchIcon } from "lucide-react";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [, setLocation] = useLocation();

  const { data: searchResults, isLoading } = useSearch(
    { q: debouncedQuery },
    { query: { enabled: debouncedQuery.length > 1 } }
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const onSelect = (type: string, id: number, conversationId?: number | null) => {
    onOpenChange(false);
    if (type === "project") {
      // Could navigate to a project view, but for now we don't have one, just close
    } else if (type === "conversation") {
      setLocation(`/c/${id}`);
    } else if (type === "message" && conversationId) {
      setLocation(`/c/${conversationId}`);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search conversations, messages, or projects..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? "Searching..." : "No results found."}
        </CommandEmpty>
        
        {searchResults?.results && searchResults.results.length > 0 && (
          <CommandGroup heading="Results">
            {searchResults.results.map((result) => (
              <CommandItem
                key={`${result.type}-${result.id}`}
                value={`${result.type}-${result.id}-${result.title}`}
                onSelect={() => onSelect(result.type, result.id, result.conversationId)}
                className="flex items-start gap-3 py-3"
              >
                <div className="mt-0.5 text-muted-foreground flex-shrink-0">
                  {result.type === "project" ? (
                    <FolderKanban className="h-4 w-4" />
                  ) : result.type === "conversation" ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : (
                    <SearchIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium truncate">{result.title}</span>
                  {result.excerpt && (
                    <span className="text-xs text-muted-foreground truncate opacity-80" dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
