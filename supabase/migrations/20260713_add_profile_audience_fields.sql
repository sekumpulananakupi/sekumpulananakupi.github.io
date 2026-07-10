-- Store the audience selected during registration and optional alumni graduation year.
-- Existing accounts stay valid because both fields are nullable.

alter table public.profiles
  add column if not exists audience text,
  add column if not exists graduation_year integer;

alter table public.profiles
  drop constraint if exists profiles_audience_valid,
  drop constraint if exists profiles_graduation_year_valid;

alter table public.profiles
  add constraint profiles_audience_valid
    check (audience is null or audience in ('prospective_student', 'student', 'alumni', 'general')),
  add constraint profiles_graduation_year_valid
    check (graduation_year is null or graduation_year between 1900 and 2100);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, nim, major, faculty, audience, graduation_year)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'nim', ''),
    nullif(new.raw_user_meta_data ->> 'major', ''),
    nullif(new.raw_user_meta_data ->> 'faculty', ''),
    nullif(new.raw_user_meta_data ->> 'audience', ''),
    nullif(new.raw_user_meta_data ->> 'graduation_year', '')::integer
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;