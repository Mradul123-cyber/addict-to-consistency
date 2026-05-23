import { useStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ChapterPicker({
  value,
  onChange,
  placeholder = "Select a chapter…",
}: {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const { tracks } = useStore();
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {tracks.map((t) => (
          <SelectGroup key={t.id}>
            <SelectLabel>{t.name}</SelectLabel>
            {t.chapters.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.priority === "High" ? "·★" : ""}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
