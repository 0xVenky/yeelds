import Link from "next/link";

export default function Loading() {
  return (
    <div className="flex-1 max-w-[640px] mx-auto w-full px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6 inline-block"
      >
        &larr; Back to pools
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          Yield Feed
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Curated yield alpha from DeFi&apos;s best analysts
        </p>
      </div>

      <div className="flex flex-col gap-4" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg animate-pulse bg-zinc-200 dark:bg-zinc-800 h-40"
          />
        ))}
      </div>
    </div>
  );
}
