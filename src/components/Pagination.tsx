"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  page: number;
  totalPages: number;
  total: number;
};

export function Pagination({ page, totalPages, total }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(newPage));
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-zinc-800 text-sm">
      <span className="text-zinc-500">
        Page {page} of {totalPages} ({total} pools)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => navigate(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => navigate(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
