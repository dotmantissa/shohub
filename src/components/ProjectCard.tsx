import { Link } from "@tanstack/react-router";
import type { Project } from "@/lib/queries";
import { projectSlug } from "@/lib/slug";
import { AssetImage } from "./AssetImage";
import { CategoryChip } from "./CategoryChip";
import { LikeButton } from "./LikeButton";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to="/project/$id"
      params={{ id: projectSlug(project) }}
      className="project-card group flex min-w-0 flex-col overflow-hidden border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <AssetImage
        account={project.owner_wallet_address}
        blobName={project.cover_blob_name}
        alt={project.name}
        className="aspect-[16/10] w-full"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="min-w-0 break-words text-lg font-semibold leading-tight text-foreground group-hover:text-primary">
            {project.name}
          </h3>
          <CategoryChip category={project.category} />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-2">
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            by <span className="font-medium text-foreground">{project.builder_name}</span>
          </span>
          <LikeButton projectId={project.id} count={project.likes_count} size="sm" />
        </div>
      </div>
    </Link>
  );
}
