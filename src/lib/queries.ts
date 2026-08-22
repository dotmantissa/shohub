import { queryOptions } from "@tanstack/react-query";
import { getProject, listProjects, projectCount } from "./server";

export const CATEGORIES = ["AI", "DePIN", "Gaming", "Infrastructure", "Storage", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Project = {
  id: string;
  created_at: string;
  onchain_id: string;
  owner_wallet_address: string;
  name: string;
  builder_name: string;
  x_handle: string;
  builder_role: string;
  team_size: number;
  location: string;
  builder_bio: string;
  description: string;
  category: Category;
  github_url: string | null;
  demo_url: string | null;
  website_url: string | null;
  social_url: string | null;
  cover_blob_name: string;
  media_blob_name: string | null;
  media_kind: "video" | "pdf" | null;
  likes_count: number;
  metadata_blob_name: string;
  tx_hash: string;
};

export type Sort = "newest" | "most_liked";

export const PAGE_SIZE = 9;

export const projectsQueryOptions = (params: {
  search: string;
  category: Category | "All";
  sort: Sort;
  page: number;
}) =>
  queryOptions({
    queryKey: ["projects", params],
    queryFn: async (): Promise<{ items: Project[]; total: number }> => {
      const result = await listProjects({ data: { ...params, pageSize: PAGE_SIZE } });
      return result as { items: Project[]; total: number };
    },
  });

export const newestProjectsQueryOptions = () =>
  queryOptions({
    queryKey: ["projects", "newest"],
    queryFn: async (): Promise<Project[]> => {
      const result = await listProjects({
        data: { search: "", category: "All", sort: "newest", page: 1, pageSize: 3 },
      });
      return result.items as Project[];
    },
  });

export const projectCountQueryOptions = () =>
  queryOptions({
    queryKey: ["projects", "count"],
    queryFn: async (): Promise<number> => {
      return (await projectCount()) as number;
    },
  });

export const projectQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["projects", id],
    queryFn: async (): Promise<Project> => {
      const data = await getProject({ data: { id } });
      if (!data) throw new Error("Not found");
      return data as Project;
    },
  });
