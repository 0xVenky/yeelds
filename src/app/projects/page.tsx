export const dynamic = "force-dynamic";

import Link from "next/link";
import { queryProtocols } from "@/lib/api/query";
import { ProjectsGrid } from "@/components/ProjectsGrid";

export default async function ProjectsPage() {
  const { protocols } = await queryProtocols();

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6 inline-block"
      >
        &larr; Back to pools
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          Projects
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Browse yield opportunities by protocol
        </p>
      </div>

      <ProjectsGrid protocols={protocols} />
    </div>
  );
}
