-- ============================================================
-- MIGRATION: FIX STUDENT & GROUP PERMISSIONS FOR EXCEL IMPORT
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ullsbiihjyppjbkadhpa/sql/new
-- ============================================================

-- 1. Ensure RLS is enabled on students and student_groups
alter table if exists public.student_groups enable row level security;
alter table if exists public.students enable row level security;

-- 2. Drop existing restrictive policies on student_groups
drop policy if exists "student_groups_isolation" on public.student_groups;
drop policy if exists "Academic structure read access" on public.student_groups;
drop policy if exists "Academic structure write access" on public.student_groups;
drop policy if exists "student_groups_read_access" on public.student_groups;
drop policy if exists "student_groups_write_access" on public.student_groups;

-- Allow all authenticated users to view groups
create policy "student_groups_read_access" on public.student_groups
  for select to authenticated
  using (true);

-- Allow super_admin, coordinator, teacher, or row owner to manage student groups
create policy "student_groups_write_access" on public.student_groups
  for all to authenticated
  using (
    is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coordinator', 'teacher', 'super_admin')
    )
  )
  with check (
    is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coordinator', 'teacher', 'super_admin')
    )
  );

-- 3. Drop existing restrictive policies on students table
drop policy if exists "students_isolation" on public.students;
drop policy if exists "Academic structure read access" on public.students;
drop policy if exists "Academic structure write access" on public.students;
drop policy if exists "students_read_access" on public.students;
drop policy if exists "students_write_access" on public.students;

-- Allow all authenticated users to read students
create policy "students_read_access" on public.students
  for select to authenticated
  using (true);

-- Allow super_admin, coordinator, teacher, or row owner to insert/update/delete students
create policy "students_write_access" on public.students
  for all to authenticated
  using (
    is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coordinator', 'teacher', 'super_admin')
    )
  )
  with check (
    is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coordinator', 'teacher', 'super_admin')
    )
  );
