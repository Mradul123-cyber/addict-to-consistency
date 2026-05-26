import { useState } from "react";
import { useStore, addCustomTask } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Plus } from "lucide-react";

export function ChapterPicker({
  value,
  onChange,
  placeholder = "Select or type a task…",
}: {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const { tracks, customTasks } = useStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allChapters = tracks.flatMap((t) =>
    t.chapters.map((c) => ({ ...c, trackName: t.name })),
  );

  const isCustom = value?.startsWith("custom:");
  const displayValue = value
    ? isCustom
      ? value.slice("custom:".length)
      : allChapters.find((c) => c.id === value)?.name ?? value
    : "";

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const handleAddCustom = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    addCustomTask(trimmed);
    handleSelect(`custom:${trimmed}`);
  };

  const s = search.toLowerCase().trim();
  const filteredChapters = !s
    ? allChapters
    : allChapters.filter((c) => c.name.toLowerCase().includes(s));
  const filteredCustomTasks = !s
    ? customTasks
    : customTasks.filter((t) => t.toLowerCase().includes(s));

  const showAdd = s && !filteredChapters.some((c) => c.name.toLowerCase() === s) && !filteredCustomTasks.some((t) => t.toLowerCase() === s);
  const hasItems = filteredChapters.length > 0 || filteredCustomTasks.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type custom task…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!hasItems && !showAdd && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No tasks found
              </p>
            )}
            {filteredChapters.length > 0 && (
              <CommandGroup>
                {filteredChapters.map((c) => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => handleSelect(c.id)}
                    className="flex items-center gap-2"
                  >
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border",
                      value === c.id ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                    )}>
                      {value === c.id && <Check className="h-3 w-3" />}
                    </div>
                    <span>{c.name}</span>
                    {c.priority === "High" && (
                      <span className="text-amber-500">★</span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{c.trackName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredCustomTasks.length > 0 && (
              <>
                {filteredChapters.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Custom Tasks">
                  {filteredCustomTasks.map((t) => (
                    <CommandItem
                      key={t}
                      onSelect={() => handleSelect(`custom:${t}`)}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                        isCustom && value?.slice("custom:".length) === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30",
                      )}>
                        {isCustom && value?.slice("custom:".length) === t && <Check className="h-3 w-3" />}
                      </div>
                      <span>{t}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            {showAdd && (
              <>
                {hasItems && <CommandSeparator />}
                <div className="p-1">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddCustom();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add &quot;{search.trim()}&quot; as custom task
                  </button>
                </div>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
