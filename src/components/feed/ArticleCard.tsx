import type { ArticleItem } from "@/lib/feed/types";
import { formatRelativeTime } from "@/lib/feed/utils";

export function ArticleCard({ item }: { item: ArticleItem }) {
  return (
    <div className="border-l-4 border-orange-500 rounded-lg bg-[var(--bg-secondary)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-orange-400 font-semibold text-sm">
          {item.source}
        </span>
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
        <span>
          {item.author} &middot; {item.read_time_min} min read
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 transition-colors"
        >
          Read &rarr;
        </a>
      </div>
    </div>
  );
}
