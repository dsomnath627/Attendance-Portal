-- ============================================================
-- ATTENDANCE WORKFLOW MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add source_file_name to attendance_sessions if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'attendance_sessions' and column_name = 'source_file_name'
  ) then
    alter table public.attendance_sessions add column source_file_name text;
  end if;
end $$;

-- 2. Add created_by to attendance_sessions if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'attendance_sessions' and column_name = 'created_by'
  ) then
    alter table public.attendance_sessions add column created_by uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- 3. Add updated_at to attendance_records for audit tracking
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'attendance_records' and column_name = 'updated_at'
  ) then
    alter table public.attendance_records add column updated_at timestamptz default now();
  end if;
end $$;

-- 4. Add updated_by to attendance_records for audit tracking
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'attendance_records' and column_name = 'updated_by'
  ) then
    alter table public.attendance_records add column updated_by uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- 5. Unique constraint: one record per student per session (prevent duplicate records)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'attendance_records_session_student_unique'
  ) then
    alter table public.attendance_records
      add constraint attendance_records_session_student_unique
      unique (session_id, student_id);
  end if;
end $$;

-- 6. Unique constraint: one session per offering per date (prevent duplicate sessions)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'attendance_sessions_offering_date_unique'
  ) then
    alter table public.attendance_sessions
      add constraint attendance_sessions_offering_date_unique
      unique (subject_offering_id, attendance_date);
  end if;
end $$;

-- 7. Function: get attendance stats for a student in a subject offering
create or replace function public.get_student_attendance_stats(
  p_student_id uuid,
  p_offering_id uuid
)
returns table (
  total_sessions bigint,
  present_count bigint,
  absent_count bigint,
  percentage numeric
) language sql security definer set search_path = public as $$
  select
    count(*) as total_sessions,
    count(*) filter (where ar.status = 'P') as present_count,
    count(*) filter (where ar.status = 'A') as absent_count,
    case
      when count(*) = 0 then 100
      else round((count(*) filter (where ar.status = 'P')::numeric / count(*)) * 100, 1)
    end as percentage
  from public.attendance_records ar
  join public.attendance_sessions ats on ar.session_id = ats.id
  where ar.student_id = p_student_id
    and ats.subject_offering_id = p_offering_id;
$$;

-- 8. Drop old overly restrictive attendance_sessions RLS and replace
drop policy if exists "attendance_sessions_isolation" on public.attendance_sessions;
drop policy if exists "attendance_sessions_read" on public.attendance_sessions;
drop policy if exists "attendance_sessions_write" on public.attendance_sessions;

create policy "attendance_sessions_read" on public.attendance_sessions
  for select to authenticated using (
    is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.subject_offerings so
      where so.id = subject_offering_id and so.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.class_enrollments ce
      join public.students s on ce.legacy_student_id = s.id
      where ce.class_id = attendance_sessions.class_id
        and s.profile_id = auth.uid()
    )
  );

create policy "attendance_sessions_write" on public.attendance_sessions
  for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- 9. Drop old attendance_records RLS and fix it
drop policy if exists "attendance_records_isolation" on public.attendance_records;
drop policy if exists "attendance_records_read" on public.attendance_records;
drop policy if exists "attendance_records_write" on public.attendance_records;

create policy "attendance_records_read" on public.attendance_records
  for select to authenticated using (
    is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.students s
      where s.id = attendance_records.student_id
        and s.profile_id = auth.uid()
    )
  );

create policy "attendance_records_write" on public.attendance_records
  for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- 10. Verify class_id and subject_offering_id exist on attendance_sessions
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'attendance_sessions' and column_name = 'subject_offering_id'
  ) then
    alter table public.attendance_sessions
      add column subject_offering_id uuid references public.subject_offerings(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'attendance_sessions' and column_name = 'class_id'
  ) then
    alter table public.attendance_sessions
      add column class_id uuid references public.classes(id) on delete set null;
  end if;
end $$;
