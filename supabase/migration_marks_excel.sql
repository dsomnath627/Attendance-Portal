-- ============================================================
-- MARKS & EXCEL WORKFLOW MIGRATION
-- ============================================================

-- 1. Add subject_offering_id and class_id to assessments if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'assessments' and column_name = 'subject_offering_id'
  ) then
    alter table public.assessments add column subject_offering_id uuid references public.subject_offerings(id) on delete cascade;
  end if;
  
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'assessments' and column_name = 'class_id'
  ) then
    alter table public.assessments add column class_id uuid references public.classes(id) on delete set null;
  end if;
end $$;

-- 2. Unique constraint: one assessment per offering per name (prevent duplicate assessments)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'assessments_offering_name_unique'
  ) then
    alter table public.assessments
      add constraint assessments_offering_name_unique
      unique (subject_offering_id, name);
  end if;
end $$;

-- 3. Unique constraint: one mark record per student per assessment
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marks_assessment_student_unique'
  ) then
    alter table public.marks
      add constraint marks_assessment_student_unique
      unique (assessment_id, student_id);
  end if;
end $$;

-- 4. Drop old assessments RLS and replace
drop policy if exists "assessments_isolation" on public.assessments;
drop policy if exists "assessments_read" on public.assessments;
drop policy if exists "assessments_write" on public.assessments;

create policy "assessments_read" on public.assessments
  for select to authenticated using (
    is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.subject_offerings so
      where so.id = subject_offering_id and so.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.class_enrollments ce
      where ce.class_id = assessments.class_id
        and ce.student_id = auth.uid()
    )
  );

create policy "assessments_write" on public.assessments
  for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());

-- 5. Drop old marks RLS and fix it
drop policy if exists "marks_isolation" on public.marks;
drop policy if exists "marks_read" on public.marks;
drop policy if exists "marks_write" on public.marks;

create policy "marks_read" on public.marks
  for select to authenticated using (
    is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.students s
      where s.id = marks.student_id
        and s.profile_id = auth.uid()
    )
  );

create policy "marks_write" on public.marks
  for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());
