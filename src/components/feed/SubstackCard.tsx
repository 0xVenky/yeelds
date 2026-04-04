import type { SubstackItem } from "@/lib/feed/types";
import { formatRelativeTime } from "@/lib/feed/utils";

export function SubstackCard({ item }: { item: SubstackItem }) {
  return (
    <div className="border-l-4 border-emerald-500 rounded-lg bg-[var(--bg-secondary)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-semibold text-sm">
            {item.publication}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-emerald-400/60 border border-emerald-400/30 rounded px-1.5 py-0.5">
            Newsletter
          </span>
        </div>
        <span className="text-[var(--text-muted)] text-xs">
          {formatRelativeTime(item.published_at)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[var(--text-primary)] text-lg font-semibold mb-2 leading-snug">
        {item.title}
      </h3>

      {/* Excerpt */}
      <p className="text-[var(--text-muted)] text-sm leading-relaxed line-clamp-3 mb-3">
        {item.excerpt}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{item.author}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Read on Substack &rarr;
        </a>
      </div>
    </div>
  );
}
