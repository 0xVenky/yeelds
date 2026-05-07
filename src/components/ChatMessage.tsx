"use client";

type Props = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export function ChatMessage({ role, content, streaming = false }: Props) {
  const isUser = role === "user";

  // User bubble: --primary accent, white-on-primary text.
  // Assistant bubble: --surface-container-low background, --on-surface text.
  // 2rem rounding (rounded-[2rem]) per Atelier; tail-rounding for chat affordance.
  const userStyles = {
    backgroundColor: "var(--primary)",
    color: "var(--on-primary)",
  };
  const assistantStyles = {
    backgroundColor: "var(--surface-container-low)",
    color: "var(--on-surface)",
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-[2rem] px-5 py-4 text-[15px] leading-relaxed ${
          isUser ? "rounded-br-md" : "rounded-bl-md"
        }`}
        style={isUser ? userStyles : assistantStyles}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose-chat">
            <MarkdownLite text={content} />
            {streaming && <StreamingCursor />}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pulsing cursor while assistant is mid-stream. */
function StreamingCursor() {
  return (
    <span
      className="inline-block w-[8px] h-[1em] align-middle ml-0.5 animate-pulse"
      style={{ backgroundColor: "var(--primary)" }}
      aria-hidden="true"
    />
  );
}

/**
 * Minimal markdown renderer — headers, bold, lists, blockquotes, tables.
 * Restyled to Atelier tokens (no hardcoded gray-* / violet-* classes).
 */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Blank line → spacer
    if (trimmed === "") {
      elements.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    // Table block
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={key++} lines={tableLines} />);
      continue;
    }

    // Blockquote block
    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quoteLines.push(lines[i].trimStart().slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={key++}
          className="pl-3 my-2 italic"
          style={{
            borderLeft: "3px solid var(--primary)",
            color: "var(--on-surface-variant)",
          }}
        >
          {quoteLines.map((ql, qi) => (
            <span key={qi}>
              {qi > 0 && <br />}
              <InlineMarkdown text={ql} />
            </span>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Bullet list block
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: { indent: number; text: string }[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const t = l.trimStart();
        if (t.startsWith("- ") || t.startsWith("* ")) {
          items.push({ indent: l.length - t.length, text: t.slice(2) });
          i++;
        } else {
          break;
        }
      }
      const baseIndent = items[0]?.indent ?? 0;
      elements.push(
        <ul key={key++} className="my-1.5 space-y-0.5">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex gap-1.5"
              style={{
                paddingLeft: `${Math.max(0, (item.indent - baseIndent) / 2) * 12}px`,
              }}
            >
              <span className="shrink-0" style={{ color: "var(--outline)" }}>
                &bull;
              </span>
              <span>
                <InlineMarkdown text={item.text} />
              </span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list block
    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: { num: string; text: string }[] = [];
      while (i < lines.length) {
        const t = lines[i].trimStart();
        const match = t.match(/^(\d+)[.)]\s(.*)$/);
        if (match) {
          items.push({ num: match[1], text: match[2] });
          i++;
        } else {
          break;
        }
      }
      elements.push(
        <ol key={key++} className="my-1.5 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-1.5">
              <span
                className="shrink-0 font-medium tabular-nums"
                style={{ color: "var(--outline)" }}
              >
                {item.num}.
              </span>
              <span>
                <InlineMarkdown text={item.text} />
              </span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={key++}
          className="font-semibold mt-3 mb-1"
          style={{ color: "var(--on-surface)" }}
        >
          <InlineMarkdown text={trimmed.slice(4)} />
        </h3>,
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={key++}
          className="font-semibold text-[15px] mt-3 mb-1"
          style={{ color: "var(--on-surface)" }}
        >
          <InlineMarkdown text={trimmed.slice(3)} />
        </h2>,
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1
          key={key++}
          className="font-bold text-base mt-3 mb-1"
          style={{ color: "var(--on-surface)" }}
        >
          <InlineMarkdown text={trimmed.slice(2)} />
        </h1>,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(
        <hr
          key={key++}
          className="my-2"
          style={{ borderColor: "var(--surface-container-high)" }}
        />,
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="my-0.5">
        <InlineMarkdown text={line} />
      </p>,
    );
    i++;
  }

  return <>{elements}</>;
}

/** Inline markdown: **bold**, `code`, plain text */
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong
              key={i}
              className="font-semibold"
              style={{ color: "var(--on-surface)" }}
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded text-xs font-mono"
              style={{
                backgroundColor: "var(--surface-container-high)",
                color: "var(--primary)",
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const parseRow = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

  const dataRows = lines.filter((l) => !/^\|[\s\-:|]+\|$/.test(l));
  if (dataRows.length === 0) return null;

  const header = parseRow(dataRows[0]);
  const body = dataRows.slice(1).map(parseRow);

  return (
    <div
      className="overflow-x-auto my-2 rounded-2xl"
      style={{ backgroundColor: "var(--surface-container)" }}
    >
      <table className="text-xs w-full">
        <thead>
          <tr style={{ backgroundColor: "var(--surface-container-high)" }}>
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-medium"
                style={{ color: "var(--on-surface-variant)" }}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2"
                  style={{ color: "var(--on-surface)" }}
                >
                  <InlineMarkdown text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
