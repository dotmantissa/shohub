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

      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <AssetImage
        account={project.owner_wallet_address}
        blobName={project.cover_blob_name}
        alt={project.name}
        className="aspect-[16/10] w-full"
      />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-tight text-foreground group-hover:text-primary">
            {project.name}
          </h3>
          <CategoryChip category={project.category} />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            by <span className="font-medium text-foreground">{project.builder_name}</span>
          </span>
          <LikeButton projectId={project.id} count={project.likes_count} size="sm" />
        </div>
      </div>
    </Link>
  );
}
