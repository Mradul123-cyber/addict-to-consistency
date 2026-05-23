import { useEffect, useState } from "react";
import { playAmbient, stopAmbient, type AmbientKind } from "@/lib/audio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function AmbientAudioControl() {
  const [kind, setKind] = useState<AmbientKind>("off");
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => stopAmbient(), []);

  const toggle = () => {
    if (playing) {
      stopAmbient();
      setPlaying(false);
    } else if (kind !== "off") {
      playAmbient(kind);
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={kind}
        onValueChange={(v) => {
          const next = v as AmbientKind;
          setKind(next);
          if (playing) {
            playAmbient(next);
            if (next === "off") setPlaying(false);
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
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={toggle} disabled={kind === "off"}>
        {playing ? "Stop" : "Play"}
      </Button>
    </div>
  );
}
