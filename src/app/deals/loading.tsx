import Link from "next/link";

export default function Loading() {
  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6 inline-block"
      >
        &larr; Back to pools
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          LP Deals
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Curated yield opportunities from LP syndicates and private deals
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl animate-pulse bg-zinc-200 dark:bg-zinc-800 h-56"
          />
        ))}
      </div>
    </div>
  );
}
