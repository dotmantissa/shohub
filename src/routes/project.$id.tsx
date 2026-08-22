import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, ExternalLink, Github, Globe2, MapPin, Users } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BuilderAvatar } from "@/components/BuilderAvatar";
import { AssetImage } from "@/components/AssetImage";
import { CategoryChip } from "@/components/CategoryChip";
import { LikeButton } from "@/components/LikeButton";
import { MediaViewer } from "@/components/MediaViewer";
import { ShelbyBadge } from "@/components/ShelbyBadge";
import { Button } from "@/components/ui/button";
import { projectQueryOptions } from "@/lib/queries";
import { extractProjectId, projectSlug, titleFromSlug } from "@/lib/slug";
import { xProfileUrl } from "@/lib/x-handle";

export const Route = createFileRoute("/project/$id")({
  component: ProjectDetails,
  head: ({ params }) => {
    const name = titleFromSlug(params.id);
    const title = name ? `${name} | Shohub` : "Project | Shohub";
    const description = name
      ? `${name}, a builder project with media served from Shelby.`
      : "A builder project with media served from Shelby.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

function ProjectDetails() {
  const { id: param } = Route.useParams();
  const id = extractProjectId(param);
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useQuery(projectQueryOptions(id));

  // Normalize the URL to the canonical, shareable slug form.
  useEffect(() => {
    if (!project) return;
    const canonical = projectSlug(project);
    if (canonical !== param) {
      navigate({ to: "/project/$id", params: { id: canonical }, replace: true });
    }
  }, [project, param, navigate]);

  const handleCoverError = useCallback(() => {
    toast.error("Cover image failed to load from Shelby.");
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Project link copied.");
    } catch {
      toast.error("Couldn’t copy the project link.");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="app-page min-h-screen">
        <SiteHeader />
        <div className="py-24 text-center text-sm text-muted-foreground">Loading project</div>
      </div>
    );
  }
  if (error || !project) throw notFound();

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="page-shell max-w-4xl pb-20 pt-8 sm:pb-24 sm:pt-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>

        <AssetImage
          account={project.owner_wallet_address}
          blobName={project.cover_blob_name}
          alt={project.name}
          className="detail-cover aspect-[16/9] w-full"
          showBadge
          onLoadError={handleCoverError}
        />

        <div className="project-heading mt-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CategoryChip category={project.category} />
            </div>
            <h1 className="mt-3 break-words text-3xl font-bold sm:text-4xl">{project.name}</h1>
            <div className="mt-4 flex items-center gap-3">
              <BuilderAvatar handle={project.x_handle} name={project.builder_name} />
              <p className="min-w-0 break-words text-sm text-muted-foreground">
                by <span className="font-medium text-foreground">{project.builder_name}</span>
                <a
                  href={xProfileUrl(project.x_handle)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-link"
                >
                  @{project.x_handle}
                </a>
              </p>
            </div>
          </div>
          <div className="project-heading__actions">
            <Button type="button" variant="outline" onClick={handleCopyLink}>
              <Copy aria-hidden="true" /> Copy link
            </Button>
            <LikeButton projectId={project.id} count={project.likes_count} />
          </div>
        </div>

        <p className="mt-6 break-words text-base leading-7 text-foreground sm:text-lg sm:leading-relaxed">
          {project.description}
        </p>

        <section className="builder-profile">
          <div className="builder-profile__heading">
            <p className="eyebrow">Meet the builder</p>
            <h2 className="mt-2 text-xl font-semibold">The people behind the pixels</h2>
          </div>
          <p className="builder-profile__bio">{project.builder_bio}</p>
          <div className="builder-profile__facts">
            <span>
              <Users className="h-4 w-4" />
              {project.team_size} {project.team_size === 1 ? "person" : "people"}
            </span>
            <span>
              <MapPin className="h-4 w-4" />
              {project.location}
            </span>
            <span>
              <strong>{project.builder_role}</strong>
            </span>
          </div>
          <a
            href="https://unavatar.io"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Avatars provided by Unavatar
          </a>
        </section>

        <div className="project-links mt-6">
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              className="button button--quiet"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
          )}
          {project.demo_url && (
            <a
              href={project.demo_url}
              target="_blank"
              rel="noreferrer"
              className="button button--primary"
            >
              <ExternalLink className="h-4 w-4" /> Live demo
            </a>
          )}
          {project.website_url && (
            <a
              href={project.website_url}
              target="_blank"
              rel="noreferrer"
              className="button button--quiet"
            >
              <Globe2 className="h-4 w-4" /> Website
            </a>
          )}
          {project.social_url && (
            <a
              href={project.social_url}
              target="_blank"
              rel="noreferrer"
              className="button button--quiet"
            >
              <ExternalLink className="h-4 w-4" /> Social link
            </a>
          )}
        </div>

        {project.media_blob_name && project.media_kind && (
          <section className="mt-12">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Media
              </h2>
              <ShelbyBadge />
            </div>
            <MediaViewer
              account={project.owner_wallet_address}
              blobName={project.media_blob_name}
              kind={project.media_kind}
            />
          </section>
        )}
      </main>
    </div>
  );
}
