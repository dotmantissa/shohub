import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDatabase } from "./neon.server";
import { verifyPrivyToken } from "./auth.server";
import { assertStoredShelbyAccount, provisionUserShelbyAccount } from "./shelby-funding.server";

const categorySchema = z.enum(["AI", "DePIN", "Gaming", "Infrastructure", "Storage", "Other"]);
export type ProjectRow = {
  id: string;
  onchain_id: string;
  owner_user_id: string;
  owner_wallet_address: string;
  created_at: string;
  name: string;
  builder_name: string;
  x_handle: string;
  builder_role: string;
  team_size: number;
  location: string;
  builder_bio: string;
  description: string;
  category: z.infer<typeof categorySchema>;
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

type SqlRows<T> = T[];

const rowsOf = <T>(result: unknown) => result as SqlRows<T>;

const authUser = async (accessToken: string) => {
  return verifyPrivyToken(accessToken);
};

export const listProjects = createServerFn({ method: "GET" })
  .validator(
    z.object({
      search: z.string().default(""),
      category: z.string().default("All"),
      sort: z.enum(["newest", "most_liked"]).default("newest"),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(30).default(12),
    }),
  )
  .handler(async ({ data }) => {
    const sql = getDatabase();
    const offset = (data.page - 1) * data.pageSize;
    const search = data.search.trim();
    const category = data.category === "All" ? null : categorySchema.parse(data.category);
    const rows = rowsOf<ProjectRow>(
      await sql`
      select id, onchain_id, created_at, name, builder_name, x_handle, description, category,
        builder_role, team_size, location, builder_bio, github_url, demo_url,
        website_url, social_url, cover_blob_name, media_blob_name, media_kind,
        likes_count, metadata_blob_name, owner_wallet_address, tx_hash
      from projects
      where (${category}::text is null or category = ${category})
        and (${search} = '' or to_tsvector('simple', name || ' ' || builder_name || ' ' || description)
          @@ plainto_tsquery('simple', ${search}))
      order by
        ${data.sort === "most_liked" ? sql`likes_count desc, created_at desc` : sql`created_at desc`}
      limit ${data.pageSize} offset ${offset}`,
    );
    const total = rowsOf<{ count: number }>(
      await sql`
      select count(*)::int as count from projects
      where (${category}::text is null or category = ${category})
        and (${search} = '' or to_tsvector('simple', name || ' ' || builder_name || ' ' || description)
          @@ plainto_tsquery('simple', ${search}))`,
    );
    return { items: rows, total: total[0]?.count ?? 0 };
  });

export const getProject = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const sql = getDatabase();
    const rows = rowsOf<ProjectRow>(
      await sql`select * from projects where id = ${data.id} limit 1`,
    );
    return rows[0] ?? null;
  });

export const projectCount = createServerFn({ method: "GET" }).handler(async () => {
  const sql = getDatabase();
  const rows = rowsOf<{ count: number }>(await sql`select count(*)::int as count from projects`);
  return rows[0]?.count ?? 0;
});

export const provisionShelbyAccount = createServerFn({ method: "POST" })
  .validator(
    z.object({
      accessToken: z.string().min(1),
      storageAccountAddress: z.string().min(1),
      domain: z.string().min(1).max(253),
    }),
  )
  .handler(async ({ data }) => {
    const user = await authUser(data.accessToken);
    return provisionUserShelbyAccount({
      user,
      address: data.storageAccountAddress,
      domain: data.domain,
    });
  });

export const saveProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      onchainId: z.string().min(1),
      accessToken: z.string().min(1),
      ownerWalletAddress: z.string().min(1),
      name: z.string().min(1).max(96),
      builderName: z.string().min(1).max(80),
      xHandle: z.string().regex(/^[A-Za-z0-9_]{1,15}$/),
      builderRole: z.string().min(1).max(80),
      teamSize: z.number().int().min(1).max(10000),
      location: z.string().min(1).max(80),
      builderBio: z.string().min(1).max(280),
      description: z.string().min(1).max(280),
      category: categorySchema,
      githubUrl: z.string().url().nullable(),
      demoUrl: z.string().url().nullable(),
      websiteUrl: z.string().url().nullable(),
      socialUrl: z.string().url().nullable(),
      coverBlobName: z.string().min(1),
      mediaBlobName: z.string().nullable(),
      mediaKind: z.enum(["video", "pdf"]).nullable(),
      metadataBlobName: z.string().min(1),
      txHash: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const user = await authUser(data.accessToken);
    await assertStoredShelbyAccount(user.id, data.ownerWalletAddress);
    const sql = getDatabase();
    const email = user.email;
    await sql`
      insert into users (id, email, wallet_address)
      values (${user.id}, ${email}, ${data.ownerWalletAddress})
      on conflict (id) do update set email = excluded.email,
        wallet_address = excluded.wallet_address, updated_at = now()`;
    const rows = rowsOf<ProjectRow>(
      await sql`
      insert into projects (
        onchain_id, owner_user_id, owner_wallet_address, name, builder_name,
        x_handle, builder_role, team_size, location, builder_bio, description, category,
        github_url, demo_url, website_url, social_url, cover_blob_name,
        media_blob_name, media_kind, metadata_blob_name, tx_hash
      ) values (
        ${data.onchainId}, ${user.id}, ${data.ownerWalletAddress}, ${data.name},
        ${data.builderName}, ${data.xHandle}, ${data.builderRole}, ${data.teamSize}, ${data.location},
        ${data.builderBio}, ${data.description}, ${data.category}, ${data.githubUrl},
        ${data.demoUrl}, ${data.websiteUrl}, ${data.socialUrl}, ${data.coverBlobName},
        ${data.mediaBlobName}, ${data.mediaKind}, ${data.metadataBlobName}, ${data.txHash}
      )
      returning *`,
    );
    return rows[0];
  });

export const likeProject = createServerFn({ method: "POST" })
  .validator(z.object({ projectId: z.string().uuid(), visitorId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const sql = getDatabase();
    const rows = rowsOf<{ liked: boolean; likes_count: number }>(
      await sql`select * from toggle_project_like(${data.projectId}, ${data.visitorId})`,
    );
    return rows[0] ?? { liked: false, likes_count: 0 };
  });
