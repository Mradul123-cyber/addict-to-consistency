import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const OPTIONS = ["High", "Medium", "Low"] as const;
type Level = (typeof OPTIONS)[number];

function variant(level: Level): "default" | "secondary" | "outline" {
  if (level === "High") return "default";
  if (level === "Medium") return "secondary";
  return "outline";
}

interface PriorityDropdownProps {
  value: Level;
  onChange: (value: Level) => void;
  className?: string;
}

export function PriorityDropdown({ value, onChange, className }: PriorityDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className={cn("focus:outline-none", className)}>
          <Badge variant={variant(value)} className="shrink-0 cursor-pointer">{value}</Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => {
            onChange(v as Level);
            setOpen(false);
          }}
        >
          {OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt} value={opt} className="text-xs">
              <Badge variant={variant(opt)} className="text-[10px] px-1.5 py-0">{opt}</Badge>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
