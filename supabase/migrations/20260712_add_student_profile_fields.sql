-- Store the profile fields collected during email/password registration.
-- Existing Google and legacy users remain valid because these columns are nullable.

alter table public.profiles
  add column if not exists nim text,
  add column if not exists major text,
  add column if not exists faculty text;

alter table public.profiles
  drop constraint if exists profiles_nim_length,
  drop constraint if exists profiles_major_length,
  drop constraint if exists profiles_faculty_length;

alter table public.profiles
  add constraint profiles_nim_length check (nim is null or char_length(nim) between 1 and 30),
  add constraint profiles_major_length check (major is null or char_length(major) between 1 and 120),
  add constraint profiles_faculty_length check (faculty is null or char_length(faculty) between 1 and 120);

create unique index if not exists profiles_nim_unique
  on public.profiles (nim)
  where nim is not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, nim, major, faculty)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'nim', ''),
    nullif(new.raw_user_meta_data ->> 'major', ''),
    nullif(new.raw_user_meta_data ->> 'faculty', '')
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
