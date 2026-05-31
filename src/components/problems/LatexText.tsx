import * as reactKatex from "react-katex";
const InlineMath = (reactKatex as any).InlineMath ?? (reactKatex as any).default?.InlineMath;
const BlockMath = (reactKatex as any).BlockMath ?? (reactKatex as any).default?.BlockMath;
import "katex/dist/katex.min.css";

export function LatexText({ text }: { text: string }) {
  if (!text) return null;

  const combined: { start: number; end: number; latex: string; block: boolean }[] = [];
  const blockRegex = /\\\[([\s\S]*?)\\\]/g;
  const inlineRegex = /\\\(([\s\S]*?)\\\)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(text)) !== null)
    combined.push({ start: m.index, end: m.index + m[0].length, latex: m[1], block: true });
  while ((m = inlineRegex.exec(text)) !== null)
    combined.push({ start: m.index, end: m.index + m[0].length, latex: m[1], block: false });
  combined.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const part of combined) {
    if (part.start > lastIndex)
      parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex, part.start)}</span>);
    parts.push(
      part.block
        ? <BlockMath key={`b${part.start}`} math={part.latex} />
        : <InlineMath key={`i${part.start}`} math={part.latex} />
    );
    lastIndex = part.end;
  }
  if (lastIndex < text.length)
    parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex)}</span>);
  return <>{parts}</>;
}
