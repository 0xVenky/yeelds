import type { TweetItem } from "@/lib/feed/types";
import { formatRelativeTime } from "@/lib/feed/utils";

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-semibold shrink-0">
      {initials}
    </div>
  );
}

export function TweetCard({ item }: { item: TweetItem }) {
  return (
    <div className="border-l-4 border-blue-500 rounded-lg bg-[var(--bg-secondary)] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Initials name={item.author_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)] truncate">
              {item.author_name}
            </span>
            <span className="text-[var(--text-muted)] text-sm truncate">
              @{item.author_handle}
            </span>
          </div>
        </div>
        <span className="text-[var(--text-muted)] text-xs whitespace-nowrap">
          {formatRelativeTime(item.published_at)}
        </span>
      </div>

      {/* Body */}
      <p className="text-[var(--text-secondary)] text-sm whitespace-pre-line leading-relaxed mb-3">
        {item.text}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-5 text-[var(--text-muted)] text-xs">
        <span className="flex items-center gap-1" title="Retweets">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {item.retweets.toLocaleString()}
        </span>
        <span className="flex items-center gap-1" title="Likes">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {item.likes.toLocaleString()}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-blue-400 hover:text-blue-300 transition-colors"
        >
          View on X &rarr;
        </a>
      </div>
    </div>
  );
}
