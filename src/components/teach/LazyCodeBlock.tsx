import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function LazyCodeBlock({
  code,
  language,
  isBlackboard,
}: {
  code: string;
  language: string;
  isBlackboard: boolean;
}) {
  return (
    <SyntaxHighlighter
      language={language || "text"}
      style={isBlackboard ? vscDarkPlus : vs}
      customStyle={{
        margin: 0,
        padding: "1rem 1.25rem",
        background: isBlackboard ? "#0d1117" : "#f6f8fa",
        fontSize: "0.85rem",
        lineHeight: 1.6,
      }}
      showLineNumbers={code.split("\n").length > 4}
      wrapLines
    >
      {code}
    </SyntaxHighlighter>
  );
}
