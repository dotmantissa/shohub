create extension if not exists pgcrypto;

create table if not exists users (
  id text primary key,
  email text,
  wallet_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  onchain_id text not null unique,
  owner_user_id text not null references users(id),
  owner_wallet_address text not null,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 96),
  builder_name text not null check (char_length(builder_name) between 1 and 80),
  x_handle text not null default 'shohub' check (char_length(x_handle) between 1 and 15),
  builder_role text not null default 'Builder' check (char_length(builder_role) between 1 and 80),
  team_size integer not null default 1 check (team_size between 1 and 10000),
  location text not null default 'Remote' check (char_length(location) between 1 and 80),
  builder_bio text not null default 'Building on Shelby.' check (char_length(builder_bio) between 1 and 280),
  description text not null check (char_length(description) between 1 and 280),
  category text not null check (category in ('AI', 'DePIN', 'Gaming', 'Infrastructure', 'Storage', 'Other')),
  github_url text,
  demo_url text,
  website_url text,
  social_url text,
  cover_blob_name text not null,
  media_blob_name text,
  media_kind text check (media_kind in ('video', 'pdf')),
  likes_count integer not null default 0,
  metadata_blob_name text not null,
  tx_hash text not null
);

alter table projects add column if not exists builder_role text not null default 'Builder';
alter table projects add column if not exists x_handle text not null default 'shohub';
alter table projects add column if not exists team_size integer not null default 1;
alter table projects add column if not exists location text not null default 'Remote';
alter table projects add column if not exists builder_bio text not null default 'Building on Shelby.';
alter table projects add column if not exists website_url text;
alter table projects add column if not exists social_url text;

create table if not exists project_likes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  unique (project_id, visitor_id)
);

create index if not exists projects_created_at_idx on projects (created_at desc);
create index if not exists projects_likes_idx on projects (likes_count desc);
create index if not exists projects_category_idx on projects (category);
create index if not exists projects_search_idx on projects using gin (to_tsvector('simple', name || ' ' || builder_name || ' ' || description));

create or replace function toggle_project_like(target_project uuid, target_visitor text)
returns table (liked boolean, likes_count integer)
language plpgsql
as $$
declare
  next_liked boolean;
begin
  if exists (
    select 1 from project_likes
    where project_id = target_project and visitor_id = target_visitor
  ) then
    delete from project_likes
    where project_id = target_project and visitor_id = target_visitor;
    next_liked := false;
  else
    insert into project_likes(project_id, visitor_id)
    values (target_project, target_visitor);
    next_liked := true;
  end if;

  update projects
  set likes_count = (select count(*) from project_likes where project_id = target_project)
  where id = target_project;

  return query select next_liked, p.likes_count from projects p where p.id = target_project;
end;
$$;
