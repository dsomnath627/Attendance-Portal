-- ==============================================================================
-- Dr. Campus: Career & Opportunities — Stages 4, 5, 6 Migration
-- Deterministic Eligibility, Application Snapshots, CV Selection,
-- Recruitment Rounds, Audit Trail History, and ATS Tracking
-- ==============================================================================

-- 1. Extend career_applications with snapshot, CV version, eligibility, and recruitment rounds
alter table public.career_applications
  add column if not exists cv_version_id       uuid references public.career_cv_versions(id) on delete set null,
  add column if not exists eligibility_status  text not null default 'eligible' check (eligibility_status in ('eligible', 'needs_review', 'not_eligible')),
  add column if not exists eligibility_reasons text[] default '{}',
  add column if not exists profile_snapshot    jsonb not null default '{}'::jsonb,
  add column if not exists current_round       text default 'Application Submitted',
  add column if not exists round_scores        jsonb default '{}'::jsonb,
  add column if not exists custom_answers      jsonb default '{}'::jsonb,
  add column if not exists withdrawn_at        timestamptz,
  add column if not exists withdrawal_reason   text;

-- Update status check constraint to include new recruitment stages
alter table public.career_applications
  drop constraint if exists career_applications_status_check;

alter table public.career_applications
  add constraint career_applications_status_check
  check (status in ('applied', 'screening', 'shortlisted', 'assessment', 'interview', 'waitlisted', 'offered', 'rejected', 'withdrawn'));

-- 2. Extend career_opportunities with configurable recruitment rounds
alter table public.career_opportunities
  add column if not exists recruitment_rounds jsonb default '["Application Review", "Online Assessment", "Technical Interview", "HR Interview"]'::jsonb;

-- 3. Application History & Recruitment Timeline (Audit Logs)
create table if not exists public.career_application_history (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.career_applications(id) on delete cascade,
  changed_by      uuid references public.profiles(id) on delete set null,
  changed_by_name text,
  from_status     text,
  to_status       text not null,
  round_name      text,
  score           numeric(5,2),
  notes           text,
  created_at      timestamptz default now()
);

-- 4. Indexes
create index if not exists idx_career_app_history_app_id on public.career_application_history(application_id);
create index if not exists idx_career_app_history_created on public.career_application_history(created_at);
create index if not exists idx_career_apps_eligibility on public.career_applications(eligibility_status);
create index if not exists idx_career_apps_cv_ver on public.career_applications(cv_version_id);

-- 5. Enable RLS
alter table public.career_application_history enable row level security;

-- 6. RLS Policies: career_application_history
drop policy if exists "History: Student reads own application history" on public.career_application_history;
create policy "History: Student reads own application history"
  on public.career_application_history
  for select
  using (
    exists (
      select 1 from public.career_applications a
      where a.id = career_application_history.application_id
        and a.student_profile_id = auth.uid()
    )
    or is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator', 'teacher'))
  );

drop policy if exists "History: Staff insert history logs" on public.career_application_history;
create policy "History: Staff insert history logs"
  on public.career_application_history
  for insert
  with check (
    is_super_admin()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator', 'teacher'))
    or exists (
      select 1 from public.career_applications a
      where a.id = career_application_history.application_id
        and a.student_profile_id = auth.uid()
    )
  );

