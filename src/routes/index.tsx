import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SearchX } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES,
  PAGE_SIZE,
  newestProjectsQueryOptions,
  projectCountQueryOptions,
  projectsQueryOptions,
  type Category,
  type Sort,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Shohub | Shelby projects worth seeing" },
      {
        name: "description",
        content: "Explore projects built by the Shelby community, with the media kept on Shelby.",
      },
      { property: "og:title", content: "Shohub | Shelby projects worth seeing" },
      {
        property: "og:description",
        content: "Explore projects built by the Shelby community, with the media kept on Shelby.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ search, category, sort, page }), [search, category, sort, page]);

  const { data, isLoading } = useQuery(projectsQueryOptions(params));
  const projects = data?.items ?? [];
  const matched = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(matched / PAGE_SIZE));
  const { data: newest = [] } = useQuery(newestProjectsQueryOptions());
  const { data: total = 0 } = useQuery(projectCountQueryOptions());

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const updateCategory = (value: Category | "All") => {
    setCategory(value);
    setPage(1);
  };
  const updateSort = (value: Sort) => {
    setSort(value);
    setPage(1);
  };

  const resetBrowse = () => {
    setSearch("");
    setCategory("All");
    setSort("newest");
    setPage(1);
  };

  return (
    <div className="app-page min-h-screen">
      <SiteHeader />

      <main className="page-shell pb-20 pt-9 sm:pb-24 sm:pt-14">
        <section className="hero-showcase">
          <div className="hero-showcase__copy">
            <h1 className="page-title font-bold text-foreground">
              Projects built on <span className="text-primary">Shelby</span>.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              A living shelf of what the Shelby community is building, with the good stuff stored on
              Shelby.
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {total} {total === 1 ? "project" : "projects"} and counting.
            </p>
          </div>
        </section>

        {newest.length > 0 && (
          <section className="mb-12" aria-labelledby="newest-projects-heading">
            <div className="mb-4 flex items-baseline justify-between">
              <h2
                id="newest-projects-heading"
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Newest Projects
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newest.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-6 flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search projects, builders, or ideas"
                className="search-input"
              />
            </div>

            <div className="browse-toolbar">
              <div className="category-filter" aria-label="Project categories">
                {(["All", ...CATEGORIES] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => updateCategory(c as Category | "All")}
                    className={`category-filter__button rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
                      category === c
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-card text-foreground ring-border hover:bg-accent"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="browse-summary">
                <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
                  {total} {total === 1 ? "project" : "projects"}
                </p>
                <select
                  value={sort}
                  onChange={(e) => updateSort(e.target.value as Sort)}
                  className="select-control"
                >
                  <option value="newest">Newest</option>
                  <option value="most_liked">Most liked</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading projects</div>
          ) : projects.length === 0 ? (
            <div className="empty-state border border-dashed border-border bg-card px-5 py-12 text-center shadow-sm sm:px-6 sm:py-16">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <SearchX aria-hidden="true" className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-foreground">No projects found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {search.trim() ? (
                  <>We couldn’t find anything for “{search.trim()}”.</>
                ) : category !== "All" ? (
                  <>There aren’t any {category} projects here yet.</>
                ) : (
                  <>There aren’t any projects to show here yet.</>
                )}{" "}
                Try a different search or browse the full showcase.
              </p>
              <Button type="button" className="mt-6" onClick={resetBrowse}>
                <Search aria-hidden="true" />
                Browse all projects
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>

              {pageCount > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-10 flex flex-wrap items-center justify-center gap-2"
                >
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="pagination-button"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      aria-current={n === page ? "page" : undefined}
                      className={`min-w-9 rounded-full px-3 py-2 text-sm font-medium ring-1 transition-colors ${
                        n === page
                          ? "bg-primary text-primary-foreground ring-primary"
                          : "bg-card text-foreground ring-border hover:bg-accent"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="pagination-button"
                  >
                    Next
                  </button>
                </nav>
              )}

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + projects.length} of{" "}
                {matched} {matched === 1 ? "project" : "projects"}
              </p>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">
        Media served from Shelby. No dusty file cabinet required.
      </footer>
    </div>
  );
}
