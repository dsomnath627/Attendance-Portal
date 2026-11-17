-- ==============================================================================
-- Dr. Campus: Career & Opportunities Module Migration
-- Phase 1: Tables, Constraints, Indexes, and Row Level Security (RLS)
-- ==============================================================================

-- 1. Student Career & Professional Profiles
-- Extends the canonical public.profiles and links to public.students
create table if not exists public.student_career_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade unique,
  student_id uuid references public.students(id) on delete set null,
  phone text,
  headline text, -- e.g. "Full Stack Developer | Final Year B.Tech CSE"
  skills text[] default '{}',
  resume_url text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  bio_summary text,
  cgpa numeric(4,2) default 0.0,
  graduation_year integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Career Opportunities (Placements, Internships, Drives)
create table if not exists public.career_opportunities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  company_logo_url text,
  title text not null, -- e.g. "Software Development Engineer"
  type text not null check (type in ('internship', 'full_time', 'part_time', 'contract')),
  location text not null,
  workplace_type text not null check (workplace_type in ('on_site', 'remote', 'hybrid')),
  description text not null,
  requirements text,
  salary_range text, -- e.g. "₹8,00,000 - ₹12,00,000 PA" or "₹30,000/month"
  deadline timestamptz not null,
  target_departments text[] default '{}', -- target department IDs or codes; empty = open to all
  target_batches text[] default '{}',      -- target batch IDs; empty = open to all
  min_cgpa numeric(4,2) default 0.0,
  min_attendance numeric(5,2) default 0.0,
  status text not null default 'open' check (status in ('draft', 'open', 'closed', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Career Applications (ATS candidate tracking)
create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.career_opportunities(id) on delete cascade,
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  resume_url text not null,
  cover_letter text,
  status text not null default 'applied' check (status in ('applied', 'screening', 'interview', 'offered', 'rejected', 'withdrawn')),
  feedback text,
  applied_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (opportunity_id, student_profile_id)
);

-- 4. Performance Indexes
create index if not exists idx_career_profiles_student_id on public.student_career_profiles(student_id);
create index if not exists idx_career_opps_status on public.career_opportunities(status);
create index if not exists idx_career_opps_deadline on public.career_opportunities(deadline);
create index if not exists idx_career_apps_opportunity on public.career_applications(opportunity_id);
create index if not exists idx_career_apps_student_profile on public.career_applications(student_profile_id);
create index if not exists idx_career_apps_status on public.career_applications(status);

-- 5. Enable Row Level Security (RLS)
alter table public.student_career_profiles enable row level security;
alter table public.career_opportunities enable row level security;
alter table public.career_applications enable row level security;

-- 6. RLS Policies: student_career_profiles
drop policy if exists "Career profiles read policy" on public.student_career_profiles;
create policy "Career profiles read policy"
  on public.student_career_profiles
  for select
  using (
    auth.uid() = profile_id
    or is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator', 'teacher'))
  );

drop policy if exists "Career profiles insert policy" on public.student_career_profiles;
create policy "Career profiles insert policy"
  on public.student_career_profiles
  for insert
  with check (auth.uid() = profile_id or is_super_admin());

drop policy if exists "Career profiles update policy" on public.student_career_profiles;
create policy "Career profiles update policy"
  on public.student_career_profiles
  for update
  using (auth.uid() = profile_id or is_super_admin());

-- 7. RLS Policies: career_opportunities
drop policy if exists "Career opportunities read policy" on public.career_opportunities;
create policy "Career opportunities read policy"
  on public.career_opportunities
  for select
  using (
    status != 'draft'
    or auth.uid() = created_by
    or is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coordinator')
  );

drop policy if exists "Career opportunities insert policy" on public.career_opportunities;
create policy "Career opportunities insert policy"
  on public.career_opportunities
  for insert
  with check (
    is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coordinator')
  );

drop policy if exists "Career opportunities update policy" on public.career_opportunities;
create policy "Career opportunities update policy"
  on public.career_opportunities
  for update
  using (
    is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coordinator')
  );

drop policy if exists "Career opportunities delete policy" on public.career_opportunities;
create policy "Career opportunities delete policy"
  on public.career_opportunities
  for delete
  using (
    is_super_admin()
    or auth.uid() = created_by
  );

-- 8. RLS Policies: career_applications
drop policy if exists "Career applications read policy" on public.career_applications;
create policy "Career applications read policy"
  on public.career_applications
  for select
  using (
    auth.uid() = student_profile_id
    or is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator', 'teacher'))
  );

drop policy if exists "Career applications insert policy" on public.career_applications;
create policy "Career applications insert policy"
  on public.career_applications
  for insert
  with check (auth.uid() = student_profile_id or is_super_admin());

drop policy if exists "Career applications update policy" on public.career_applications;
create policy "Career applications update policy"
  on public.career_applications
  for update
  using (
    auth.uid() = student_profile_id
    or is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coordinator')
  );

-- 9. Storage Bucket setup for resumes (if storage extension is enabled)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', true, 10485760, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

drop policy if exists "Allow authenticated resume uploads" on storage.objects;
create policy "Allow authenticated resume uploads"
  on storage.objects
  for insert
  with check (bucket_id = 'resumes' and auth.role() = 'authenticated');

drop policy if exists "Allow reading resumes" on storage.objects;
create policy "Allow reading resumes"
  on storage.objects
  for select
  using (bucket_id = 'resumes' and auth.role() = 'authenticated');

