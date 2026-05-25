import type { NotesDocument } from "./notes";

export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "formula"; label?: string; expr: string };

export interface Chapter {
  id: string;
  name: string;
  shortNotes?: ContentBlock[];
  formulaSheet?: ContentBlock[];
}

export interface Subject {
  id: string;
  name: string;
  short: string;
  chapters: Chapter[];
}

export const SUBJECT_SHORT: Record<string, string> = {
  physics: "PHY",
  pchem: "PC",
  phychem: "PC",
  ochem: "OC",
  orgchem: "OC",
  ichem: "IC",
  inorgchem: "IC",
  maths: "MA",
  math: "MA",
};

/** Prototype subject ids → production track ids */
export const SUBJECT_META_ID: Record<string, string> = {
  physics: "physics",
  pchem: "phychem",
  phychem: "phychem",
  ochem: "orgchem",
  orgchem: "orgchem",
  ichem: "inorgchem",
  inorgchem: "inorgchem",
  maths: "math",
  math: "math",
};

export function blocksToDocument(blocks: ContentBlock[]): NotesDocument {
  const sections: NotesDocument["sections"] = [];
  let current: NotesDocument["sections"][number] | null = null;

  const pushCurrent = () => {
    if (current) sections.push(current);
    current = null;
  };

  for (const block of blocks) {
    if (block.type === "heading") {
      pushCurrent();
      current = { title: block.text, content: "", formulas: [] };
    } else if (block.type === "paragraph" && current) {
      current.content = current.content
        ? `${current.content}\n\n${block.text}`
        : block.text;
    } else if (block.type === "formula" && current) {
      current.formulas.push({
        label: block.label ?? "Formula",
        formula: block.expr,
      });
    }
  }
  pushCurrent();
  return { sections };
}

export function documentToBlocks(doc: NotesDocument | null | undefined): ContentBlock[] | undefined {
  if (!doc?.sections?.length) return undefined;
  const blocks: ContentBlock[] = [];
  for (const section of doc.sections) {
    blocks.push({ type: "heading", text: section.title });
    if (section.content.trim()) {
      blocks.push({ type: "paragraph", text: section.content });
    }
    for (const f of section.formulas) {
      blocks.push({ type: "formula", label: f.label, expr: f.formula });
    }
  }
  return blocks.length ? blocks : undefined;
}
