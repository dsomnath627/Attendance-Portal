-- ==============================================================================
-- Dr. Campus: Student Career Profile — Stage 3 Migration
-- New tables for rich student career data (all student-editable).
-- Institutional/academic data remains READ-ONLY from existing tables.
-- ==============================================================================

-- 1. Extend student_career_profiles with new columns
--    (adds to what migration_career.sql already created)
alter table public.student_career_profiles
  add column if not exists avatar_url          text,          -- profile photo (Supabase Storage)
  add column if not exists introduction        text,          -- personal intro / about me
  add column if not exists phone               text,
  add column if not exists current_semester    integer,       -- e.g. 5 (student-declared; official comes from enrollment)
  add column if not exists marks_10th          numeric(5,2),  -- student-entered, verified by admin
  add column if not exists marks_12th          numeric(5,2),
  add column if not exists marks_10th_verified boolean default false,
  add column if not exists marks_12th_verified boolean default false,
  add column if not exists active_backlogs     integer default 0,
  add column if not exists total_backlogs      integer default 0,
  add column if not exists backlogs_verified   boolean default false,
  add column if not exists soft_skills         text[] default '{}',
  add column if not exists technical_skills    text[] default '{}';

-- Drop old generic 'skills' column safely (if still empty / unused)
-- We keep it for backward compat; new code uses technical_skills + soft_skills

-- 2. Projects table (student-editable)
create table if not exists public.career_projects (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  technologies text[] default '{}',
  repo_url     text,
  demo_url     text,
  start_date   date,
  end_date     date,         -- null = ongoing
  is_featured  boolean default false,
  sort_order   integer default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 3. Work experience / internship history (student-editable)
create table if not exists public.career_experiences (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  company      text not null,
  role         text not null,
  type         text check (type in ('internship','part_time','full_time','freelance','research','volunteer')),
  location     text,
  start_date   date,
  end_date     date,         -- null = current
  description  text,
  skills_used  text[] default '{}',
  sort_order   integer default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 4. Certifications & achievements (student-editable)
create table if not exists public.career_certifications (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  issuing_org     text,
  issue_date      date,
  expiry_date     date,
  credential_id   text,
  credential_url  text,
  type            text check (type in ('certification','achievement','award','publication','patent','other')) default 'certification',
  sort_order      integer default 0,
  created_at      timestamptz default now()
);

-- 5. CV / Resume versions (student-editable, one primary)
create table if not exists public.career_cv_versions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  label        text not null,         -- e.g. "General CV", "Frontend Role CV"
  file_url     text not null,
  file_name    text,
  is_primary   boolean default false,
  uploaded_at  timestamptz default now()
);

-- 6. Official SGPA records (admin/coordinator-entered, NOT student-editable)
create table if not exists public.student_sgpa_records (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  semester_no  integer not null,       -- 1, 2, 3 …
  semester_name text,                  -- e.g. "Semester 1 (2022-23)"
  sgpa         numeric(4,2) not null,
  cgpa         numeric(4,2),           -- running CGPA at that semester
  backlogs     integer default 0,
  entered_by   uuid references public.profiles(id) on delete set null,
  entered_at   timestamptz default now(),
  unique(student_id, semester_no)
);

-- 7. Indexes
create index if not exists idx_career_projects_profile   on public.career_projects(profile_id);
create index if not exists idx_career_experiences_profile on public.career_experiences(profile_id);
create index if not exists idx_career_certs_profile      on public.career_certifications(profile_id);
create index if not exists idx_career_cvs_profile        on public.career_cv_versions(profile_id);
create index if not exists idx_sgpa_student              on public.student_sgpa_records(student_id);

-- 8. Enable RLS
alter table public.career_projects       enable row level security;
alter table public.career_experiences    enable row level security;
alter table public.career_certifications enable row level security;
alter table public.career_cv_versions    enable row level security;
alter table public.student_sgpa_records  enable row level security;

-- 9. RLS: career_projects (student owns; coordinators/admins read)
drop policy if exists "Projects: student owns" on public.career_projects;
create policy "Projects: student owns" on public.career_projects
  for all using (profile_id = auth.uid() or is_super_admin())
  with check (profile_id = auth.uid() or is_super_admin());

drop policy if exists "Projects: staff read" on public.career_projects;
create policy "Projects: staff read" on public.career_projects
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator','teacher','super_admin')));

-- 10. RLS: career_experiences
drop policy if exists "Experiences: student owns" on public.career_experiences;
create policy "Experiences: student owns" on public.career_experiences
  for all using (profile_id = auth.uid() or is_super_admin())
  with check (profile_id = auth.uid() or is_super_admin());

drop policy if exists "Experiences: staff read" on public.career_experiences;
create policy "Experiences: staff read" on public.career_experiences
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator','teacher','super_admin')));

-- 11. RLS: career_certifications
drop policy if exists "Certs: student owns" on public.career_certifications;
create policy "Certs: student owns" on public.career_certifications
  for all using (profile_id = auth.uid() or is_super_admin())
  with check (profile_id = auth.uid() or is_super_admin());

drop policy if exists "Certs: staff read" on public.career_certifications;
create policy "Certs: staff read" on public.career_certifications
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator','teacher','super_admin')));

-- 12. RLS: career_cv_versions
drop policy if exists "CVs: student owns" on public.career_cv_versions;
create policy "CVs: student owns" on public.career_cv_versions
  for all using (profile_id = auth.uid() or is_super_admin())
  with check (profile_id = auth.uid() or is_super_admin());

drop policy if exists "CVs: staff read" on public.career_cv_versions;
create policy "CVs: staff read" on public.career_cv_versions
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator','teacher','super_admin')));

-- 13. RLS: student_sgpa_records (read by student, write by admin/coordinator only)
drop policy if exists "SGPA: student reads own" on public.student_sgpa_records;
create policy "SGPA: student reads own" on public.student_sgpa_records
  for select using (
    is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator','teacher'))
    or exists (select 1 from public.students where id = student_sgpa_records.student_id and profile_id = auth.uid())
  );

drop policy if exists "SGPA: admin writes" on public.student_sgpa_records;
create policy "SGPA: admin writes" on public.student_sgpa_records
  for all using (is_super_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = 'coordinator'))
  with check (is_super_admin() or exists (select 1 from public.profiles where id = auth.uid() and role = 'coordinator'));

-- 14. Storage bucket for profile photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- 15. Career Applications custom answers
alter table public.career_applications
  add column if not exists custom_answers jsonb default '{}'::jsonb;

drop policy if exists "Avatar uploads" on storage.objects;
create policy "Avatar uploads" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Avatar reads" on storage.objects;
create policy "Avatar reads" on storage.objects
  for select using (bucket_id = 'avatars');

