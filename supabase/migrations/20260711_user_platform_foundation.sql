-- Public-account, moderation, and audit foundation.
-- Apply after reviewing existing admin users; promote staff in public.user_roles explicitly.

create type public.app_role as enum ('member', 'contributor', 'moderator', 'admin');
create type public.moderation_status as enum ('draft', 'pending', 'in_review', 'needs_changes', 'approved', 'rejected', 'published', 'archived');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id)
);

create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('moderator', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  interests text[] not null default '{}',
  preferred_subjects text[] not null default '{}',
  campus_locations text[] not null default '{}',
  budget_min numeric check (budget_min is null or budget_min >= 0),
  budget_max numeric check (budget_max is null or budget_max >= budget_min),
  entry_routes text[] not null default '{}',
  career_goals text[] not null default '{}',
  academic_strengths text[] not null default '{}',
  priorities jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('jurusan', 'lowongan', 'dokumen', 'info', 'wiki', 'calendar')),
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create table if not exists public.checklist_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_key text not null,
  item_key text not null,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, checklist_key, item_key)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  job_alerts boolean not null default false,
  calendar_alerts boolean not null default false,
  major_alerts boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique
);

create table if not exists public.community_listings (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  category_id bigint references public.community_categories(id),
  faculty text,
  majors text[] not null default '{}',
  interests text[] not null default '{}',
  contact_url text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'official')),
  status public.moderation_status not null default 'draft',
  created_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  listing_id bigint references public.community_listings(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  target_type text not null,
  target_id text not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.saved_items enable row level security;
alter table public.checklist_progress enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.community_categories enable row level security;
alter table public.community_listings enable row level security;
alter table public.community_reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.audit_log enable row level security;

create policy "Profiles can be read by signed in users" on public.profiles for select to authenticated using (true);
create policy "Users manage their profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Users read their own role" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "Users manage own preferences" on public.user_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own saved items" on public.saved_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own checklist progress" on public.checklist_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own notification preferences" on public.notification_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Users update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Categories are publicly readable" on public.community_categories for select to anon, authenticated using (true);
create policy "Published community listings are publicly readable" on public.community_listings for select to anon, authenticated using (status = 'published' or created_by = auth.uid() or public.is_staff());
create policy "Signed in users submit community listings" on public.community_listings for insert to authenticated with check (created_by = auth.uid() and status in ('draft', 'pending'));
create policy "Authors edit unreviewed listings" on public.community_listings for update to authenticated using (created_by = auth.uid() and status in ('draft', 'needs_changes')) with check (created_by = auth.uid() and status in ('draft', 'pending'));
create policy "Staff moderate community listings" on public.community_listings for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Authenticated users submit reports" on public.community_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Users manage their blocks" on public.user_blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "Staff read reports" on public.community_reports for select to authenticated using (reporter_id = auth.uid() or public.is_staff());
create policy "Staff resolve reports" on public.community_reports for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff read audit log" on public.audit_log for select to authenticated using (public.is_staff());

-- Revoke dangerous broad write policies from the initial kosan migration.
drop policy if exists "Admin dapat menambah kosan" on public.kosan;
drop policy if exists "Admin dapat mengubah kosan" on public.kosan;
drop policy if exists "Admin dapat menghapus kosan" on public.kosan;
create policy "Staff can add kosan" on public.kosan for insert to authenticated with check (public.is_staff());
create policy "Staff can update kosan" on public.kosan for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can delete kosan" on public.kosan for delete to authenticated using (public.is_staff());

-- Record moderation and report-resolution decisions server-side.
create or replace function public.audit_community_governance_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'community_listings' and old.status is distinct from new.status then
    insert into public.audit_log (actor_id, target_type, target_id, action, old_value, new_value)
    values (
      auth.uid(),
      'community_listing',
      new.id::text,
      'status_changed',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  elsif tg_table_name = 'community_reports' and old.status is distinct from new.status then
    insert into public.audit_log (actor_id, target_type, target_id, action, old_value, new_value)
    values (
      auth.uid(),
      'community_report',
      new.id::text,
      'status_changed',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger audit_community_listing_status
  after update of status on public.community_listings
  for each row execute procedure public.audit_community_governance_change();

create trigger audit_community_report_status
  after update of status on public.community_reports
  for each row execute procedure public.audit_community_governance_change();
