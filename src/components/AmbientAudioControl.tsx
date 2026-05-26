import { useEffect, useRef, useState } from "react";
import {
  playAmbient,
  stopAmbient,
  loadCustomAudios,
  addCustomAudio,
  removeCustomAudio,
  setLastSelection,
  getLastSelection,
  useIsPlaying,
  type AmbientKind,
} from "@/lib/audio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ListMusic, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function AmbientAudioControl() {
  const [selectedValue, setSelectedValue] = useState<string>(() => {
    const sel = getLastSelection();
    if (sel.kind === "custom") {
      const audios = loadCustomAudios();
      if (sel.customName && audios.some((a) => a.name === sel.customName)) {
        return `custom:${sel.customName}`;
      }
      return "off";
    }
    return sel.kind;
  });
  const [customAudios, setCustomAudios] = useState(loadCustomAudios());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playing = useIsPlaying();

  const isCustom = selectedValue.startsWith("custom:");
  const currentCustomName = isCustom ? selectedValue.slice("custom:".length) : null;

  useEffect(() => () => stopAmbient(), []);

  const refreshCustomAudios = () => setCustomAudios(loadCustomAudios());

  const toggle = () => {
    if (playing) {
      stopAmbient();
    } else if (selectedValue !== "off") {
      if (isCustom && currentCustomName) {
        playAmbient("custom", currentCustomName);
      } else if (!isCustom) {
        playAmbient(selectedValue as AmbientKind);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (customAudios.some((a) => a.name === file.name)) {
      toast.error(`"${file.name}" is already uploaded.`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const added = addCustomAudio(file.name, reader.result as string);
      if (!added) {
        toast.error("Maximum 5 custom audios. Remove one first.");
        return;
      }
      refreshCustomAudios();
      setSelectedValue(`custom:${file.name}`);
      setLastSelection("custom", file.name);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleDeleteCustom = (name: string) => {
    const wasPlaying = playing && currentCustomName === name;
    removeCustomAudio(name);
    refreshCustomAudios();

    if (wasPlaying) {
      stopAmbient();
    }

    if (currentCustomName === name) {
      const remaining = loadCustomAudios();
      if (remaining.length > 0) {
        setSelectedValue(`custom:${remaining[0].name}`);
        setLastSelection("custom", remaining[0].name);
      } else {
        setSelectedValue("off");
        setLastSelection("off");
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept="audio/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <Select
        value={selectedValue}
        onValueChange={(v) => {
          if (v === "__upload__") {
            fileInputRef.current?.click();
            return;
          }
          setSelectedValue(v);
          if (v.startsWith("custom:")) {
            setLastSelection("custom", v.slice("custom:".length));
          } else {
            setLastSelection(v as AmbientKind);
          }
          if (playing) {
            if (v.startsWith("custom:")) {
              playAmbient("custom", v.slice("custom:".length));
            } else if (v !== "off") {
              playAmbient(v as AmbientKind);
            } else {
              stopAmbient();
            }
          }
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="off">No audio</SelectItem>
          <SelectItem value="white">White Noise</SelectItem>
          <SelectItem value="brown">Brown Noise</SelectItem>
          <SelectItem value="binaural">Binaural Beats</SelectItem>
          {customAudios.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Custom
              </div>
              {customAudios.map((a) => (
                <SelectItem key={a.name} value={`custom:${a.name}`}>
                  {a.name}
                </SelectItem>
              ))}
            </>
          )}
          <SelectItem value="__upload__">
            {customAudios.length >= 5
              ? "Max 5 audios (remove one first)"
              : "+ Upload audio"}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={toggle}
        disabled={selectedValue === "off"}
      >
        {playing ? "Stop" : "Play"}
      </Button>
      {customAudios.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ListMusic className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="space-y-1">
              <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
                Uploaded audios
              </p>
              {customAudios.map((a) => (
                <div
                  key={a.name}
                  className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="truncate">{a.name}</span>
                  <button
                    onClick={() => handleDeleteCustom(a.name)}
                    className="ml-2 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-primary hover:bg-muted"
              >
                + Upload new
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
