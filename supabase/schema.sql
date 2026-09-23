-- Attendance Portal TIU - Complete Multi-Tenant & Role-Based Schema
-- Supports Teacher Data Segregation (User Isolation) & Super Admin Oversight

create extension if not exists pgcrypto;

-- ============================================================
-- 1. USER PROFILES & ROLES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'teacher' check (role in ('super_admin', 'coordinator', 'teacher', 'student')),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Function to check if current authenticated user is super_admin
create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- Trigger to automatically create profile record when user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, status, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    'approved',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profile RLS Policies
drop policy if exists "Profiles read access" on public.profiles;
create policy "Profiles read access" on public.profiles
  for select to authenticated
  using (id = auth.uid() or is_super_admin());

drop policy if exists "Profiles update access" on public.profiles;
create policy "Profiles update access" on public.profiles
  for update to authenticated
  using (id = auth.uid() or is_super_admin())
  with check (id = auth.uid() or is_super_admin());

drop policy if exists "Profiles insert access" on public.profiles;
create policy "Profiles insert access" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() or is_super_admin());

-- ============================================================
-- 2. APPLICATION DATA TABLES (WITH USER ISOLATION)
-- ============================================================

-- Departments
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  code text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Batches
create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Student Groups
create table if not exists public.student_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Students
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id text not null,
  name text not null,
  slr text,
  department_id uuid references public.departments(id) on delete set null,
  batch_id uuid references public.batches(id) on delete set null,
  group_id uuid references public.student_groups(id) on delete set null,
  attendance_code text,
  batch text check (batch in ('BCS 2A','BCS 2B','BCS 2C','BCS 2D')),
  code text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Assessments
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  batch_id uuid references public.batches(id) on delete set null,
  name text not null,
  assessment_type text not null default 'LIA',
  max_marks numeric default 100,
  assessment_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Attendance Sessions
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  attendance_date date not null,
  department_id uuid references public.departments(id) on delete set null,
  batch_id uuid references public.batches(id) on delete set null,
  group_id uuid references public.student_groups(id) on delete set null,
  created_at timestamptz default now()
);

-- Attendance Records
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid references public.attendance_sessions(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  status text not null check (status in ('P','A')),
  detected_code text,
  created_at timestamptz default now()
);

-- Marks
create table if not exists public.marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  marks numeric,
  created_at timestamptz default now()
);

-- Excel Workbook Attendance (backward compatibility)
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id text not null,
  batch text not null check (batch in ('BCS 2A','BCS 2B','BCS 2C','BCS 2D')),
  date date not null,
  status text not null default 'P' check(status in ('P','A')),
  source_name text,
  raw_text text,
  created_at timestamptz default now()
);

-- Excel Workbook Marks (backward compatibility)
create table if not exists public.mark_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id text not null,
  batch text not null check (batch in ('BCS 2A','BCS 2B','BCS 2C','BCS 2D')),
  assessment_values jsonb not null default '{}'::jsonb,
  lia10 jsonb not null default '[]'::jsonb,
  lia16 jsonb not null default '[]'::jsonb,
  lab numeric,
  viva numeric,
  total numeric,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Workbook Metadata
create table if not exists public.workbook_meta (
  id bigint generated by default as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  batch text not null,
  attendance_headers jsonb not null default '[]'::jsonb,
  mark_headers jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

alter table public.departments enable row level security;
alter table public.batches enable row level security;
alter table public.student_groups enable row level security;
alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.marks enable row level security;
alter table public.attendance enable row level security;
alter table public.mark_records enable row level security;
alter table public.workbook_meta enable row level security;

-- Helper macro macro policy pattern applied to all data tables:
-- Teacher can access/modify rows where user_id = auth.uid()
-- Super Admin can access/modify all rows (is_super_admin() is true)

-- Departments
drop policy if exists "departments_isolation" on public.departments;
create policy "departments_isolation" on public.departments for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Batches
drop policy if exists "batches_isolation" on public.batches;
create policy "batches_isolation" on public.batches for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Student Groups
drop policy if exists "student_groups_isolation" on public.student_groups;
create policy "student_groups_isolation" on public.student_groups for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Students
drop policy if exists "students_isolation" on public.students;
create policy "students_isolation" on public.students for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Assessments
drop policy if exists "assessments_isolation" on public.assessments;
create policy "assessments_isolation" on public.assessments for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Attendance Sessions
drop policy if exists "attendance_sessions_isolation" on public.attendance_sessions;
create policy "attendance_sessions_isolation" on public.attendance_sessions for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Attendance Records
drop policy if exists "attendance_records_isolation" on public.attendance_records;
create policy "attendance_records_isolation" on public.attendance_records for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Marks
drop policy if exists "marks_isolation" on public.marks;
create policy "marks_isolation" on public.marks for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Attendance
drop policy if exists "attendance_isolation" on public.attendance;
create policy "attendance_isolation" on public.attendance for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Mark Records
drop policy if exists "mark_records_isolation" on public.mark_records;
create policy "mark_records_isolation" on public.mark_records for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- Workbook Meta
drop policy if exists "workbook_meta_isolation" on public.workbook_meta;
create policy "workbook_meta_isolation" on public.workbook_meta for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- ============================================================
-- 4. NEW ACADEMIC ENTITIES & OWNERSHIP
-- ============================================================

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id) on delete cascade,
  name text not null,
  level text,
  duration_years integer,
  created_at timestamptz default now()
);

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  is_current boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.batches(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id) on delete cascade,
  name text not null,
  code text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.subject_offerings (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  semester_id uuid references public.semesters(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  roll_number text,
  created_at timestamptz default now()
);

create table if not exists public.coordinator_departments (
  id uuid primary key default gen_random_uuid(),
  coordinator_id uuid references public.profiles(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  created_at timestamptz default now(),
  unique(coordinator_id, department_id)
);

alter table public.programs enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_offerings enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.coordinator_departments enable row level security;

-- Basic read access
create policy "Academic structure read access" on public.programs for select to authenticated using (true);
create policy "Academic structure read access" on public.academic_years for select to authenticated using (true);
create policy "Academic structure read access" on public.semesters for select to authenticated using (true);
create policy "Academic structure read access" on public.classes for select to authenticated using (true);
create policy "Academic structure read access" on public.subjects for select to authenticated using (true);
create policy "Academic structure read access" on public.subject_offerings for select to authenticated using (true);
create policy "Academic structure read access" on public.class_enrollments for select to authenticated using (true);
