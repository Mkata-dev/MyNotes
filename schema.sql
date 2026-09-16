-- ==============================================================================
-- QuickNotes - Supabase Top-Level Database Schema
-- Version: 1.0.0
-- Database Engine: PostgreSQL 15+ (Compatible with Supabase PostgreSQL 17)
-- Description: Multi-tenant, secure, high-performance schema for QuickNotes,
--              featuring RLS, full-text search, trigram matching, automated
--              timestamps, JSON-aggregated views, and Realtime replication.
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- 2. UTILITY FUNCTIONS & TRIGGERS
-- Automatically update updated_at timestamp on row modification
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Automatically manage trashed_at timestamp when is_trashed changes
create or replace function public.handle_note_trash_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.is_trashed = true and (old.is_trashed is null or old.is_trashed = false) then
    new.trashed_at = now();
  elsif new.is_trashed = false and old.is_trashed = true then
    new.trashed_at = null;
  end if;
  return new;
end;
$$;

-- 3. USER SETTINGS & PREFERENCES TABLE
create table if not exists public.user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  font_size text not null default 'medium' check (font_size in ('small', 'medium', 'large')),
  auto_save_delay integer not null default 400 check (auto_save_delay >= 100 and auto_save_delay <= 5000),
  sort_by text not null default 'updated' check (sort_by in ('updated', 'created', 'title')),
  filter_mode text not null default 'all' check (filter_mode in ('all', 'pinned', 'archived', 'trash')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for user_settings updated_at
drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- 3b. PUBLIC PROFILES TABLE (extends auth.users for client-safe user data)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for profiles updated_at
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS on profiles: public read, owner write
alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Auto-provision user_settings AND profiles on user signup in auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      null
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Revoke public execution of the security definer function for safety
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. NOTES TABLE
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null default '',
  content text not null default '',
  pinned boolean not null default false,
  order_index integer not null default 0,
  color varchar(32) default null,
  is_archived boolean not null default false,
  is_trashed boolean not null default false,
  trashed_at timestamptz default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored
);

-- Triggers for notes
drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_notes_trash_state on public.notes;
create trigger trg_notes_trash_state
  before update on public.notes
  for each row execute function public.handle_note_trash_state();

-- 5. TAGS TABLE
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  color varchar(32) default null,
  created_at timestamptz not null default now(),
  constraint uq_tags_user_name unique (user_id, name)
);

-- 6. NOTE_TAGS JUNCTION TABLE
create table if not exists public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);

-- 7. PERFORMANCE INDEXES
create index if not exists idx_notes_user_id on public.notes (user_id);
create index if not exists idx_notes_active_list on public.notes (user_id, pinned desc, order_index asc, updated_at desc)
  where is_trashed = false and is_archived = false;
create index if not exists idx_notes_trash on public.notes (user_id, trashed_at desc)
  where is_trashed = true;
create index if not exists idx_notes_archive on public.notes (user_id, updated_at desc)
  where is_archived = true and is_trashed = false;
create index if not exists idx_notes_search_vector on public.notes using gin (search_vector);
create index if not exists idx_notes_trgm_title on public.notes using gin (title extensions.gin_trgm_ops);

create index if not exists idx_tags_user_id on public.tags (user_id);
create index if not exists idx_note_tags_tag_id on public.note_tags (tag_id);
create index if not exists idx_note_tags_note_id on public.note_tags (note_id);

-- 8. ROW LEVEL SECURITY (RLS)
alter table public.user_settings enable row level security;
alter table public.notes enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;

-- user_settings policies
drop policy if exists "Users can view their own settings" on public.user_settings;
create policy "Users can view their own settings"
  on public.user_settings for select
  using (id = (select auth.uid()));

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (id = (select auth.uid()));

-- notes policies
drop policy if exists "Users can view their own notes" on public.notes;
create policy "Users can view their own notes"
  on public.notes for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
  on public.notes for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
  on public.notes for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes for delete
  using (user_id = (select auth.uid()));

-- tags policies
drop policy if exists "Users can view their own tags" on public.tags;
create policy "Users can view their own tags"
  on public.tags for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own tags" on public.tags;
create policy "Users can insert their own tags"
  on public.tags for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own tags" on public.tags;
create policy "Users can update their own tags"
  on public.tags for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own tags" on public.tags;
create policy "Users can delete their own tags"
  on public.tags for delete
  using (user_id = (select auth.uid()));

-- note_tags policies
drop policy if exists "Users can view their own note_tags" on public.note_tags;
create policy "Users can view their own note_tags"
  on public.note_tags for select
  using (
    exists (
      select 1 from public.notes n
      where n.id = note_tags.note_id
        and n.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert their own note_tags" on public.note_tags;
create policy "Users can insert their own note_tags"
  on public.note_tags for insert
  with check (
    exists (
      select 1 from public.notes n
      where n.id = note_tags.note_id
        and n.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own note_tags" on public.note_tags;
create policy "Users can delete their own note_tags"
  on public.note_tags for delete
  using (
    exists (
      select 1 from public.notes n
      where n.id = note_tags.note_id
        and n.user_id = (select auth.uid())
    )
  );

-- 9. VIEWS & RPC FUNCTIONS
-- View: notes_with_tags (JSON-aggregated tags for frontend efficiency)
create or replace view public.notes_with_tags
with (security_invoker = true)
as
select
  n.id,
  n.user_id,
  n.title,
  n.content,
  n.pinned,
  n.order_index,
  n.color,
  n.is_archived,
  n.is_trashed,
  n.trashed_at,
  n.created_at,
  n.updated_at,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'color', t.color
        ) order by t.name asc
      )
      from public.note_tags nt
      join public.tags t on t.id = nt.tag_id
      where nt.note_id = n.id
    ),
    '[]'::jsonb
  ) as tags
from public.notes n;

-- RPC: Search notes with ranked full-text search and trigram fallback
create or replace function public.search_notes(
  search_query text,
  match_limit int default 20
)
returns setof public.notes_with_tags
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  cleaned_query text := trim(search_query);
begin
  if cleaned_query is null or cleaned_query = '' then
    return query
    select * from public.notes_with_tags
    where is_trashed = false and is_archived = false
    order by pinned desc, order_index asc, updated_at desc
    limit match_limit;
  else
    return query
    select * from public.notes_with_tags
    where is_trashed = false
      and is_archived = false
      and (
        search_vector @@ plainto_tsquery('english', cleaned_query)
        or title ilike ('%' || cleaned_query || '%')
        or content ilike ('%' || cleaned_query || '%')
      )
    order by
      ts_rank_cd(search_vector, plainto_tsquery('english', cleaned_query)) desc,
      pinned desc,
      updated_at desc
    limit match_limit;
  end if;
end;
$$;

-- 10. REALTIME CONFIGURATION
-- Ensure tables broadcast full row state on updates
alter table public.notes replica identity full;
alter table public.user_settings replica identity full;
alter table public.tags replica identity full;
alter table public.note_tags replica identity full;
alter table public.profiles replica identity full;

-- Add tables to the supabase_realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_settings'
  ) then
    alter publication supabase_realtime add table public.user_settings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tags'
  ) then
    alter publication supabase_realtime add table public.tags;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'note_tags'
  ) then
    alter publication supabase_realtime add table public.note_tags;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
