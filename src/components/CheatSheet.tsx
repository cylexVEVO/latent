interface Props {
  onClose: () => void;
}

const items = [
  ["# H1  ## H2  ### H3", "Headings"],
  ["**bold**", "Bold"],
  ["*italic*", "Italic"],
  ["~~strike~~", "Strikethrough"],
  ["`code`", "Inline code"],
  ["```\nblock\n```", "Code block"],
  ["> quote", "Blockquote"],
  ["[text](url)", "Link"],
  ["- item", "Bullet list"],
  ["1. item", "Numbered list"],
  ["---", "Horizontal rule"],
] as const;

export default function CheatSheet({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-end justify-start p-3 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-200 rounded w-64 mb-12 ml-0 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Markdown</span>
          <button onClick={onClose} className="text-neutral-300 hover:text-neutral-500 text-xs cursor-pointer">
            ✕
          </button>
        </div>
        <div className="px-4 py-3 space-y-2">
          {items.map(([syntax, label]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <code className="text-xs font-mono text-neutral-500 whitespace-pre">{syntax}</code>
              <span className="text-xs text-neutral-300 shrink-0">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
