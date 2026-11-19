-- ==============================================================================
-- Dr. Campus: Career & Opportunities Module — Stage 2 Migration
-- Extends career_opportunities with richer eligibility, company info,
-- custom questions, and coordinator-scoped access
-- ==============================================================================

-- 1. Extend career_opportunities table with new columns
alter table public.career_opportunities
  add column if not exists company_website     text,
  add column if not exists company_description text,
  add column if not exists duration            text,          -- e.g. "6 months", "Full Time"
  add column if not exists stipend             text,          -- e.g. "₹25,000/month"
  add column if not exists ctc                 text,          -- e.g. "7.5 LPA"
  add column if not exists min_marks_10th      numeric(5,2) default 0,  -- e.g. 60.00 (percent)
  add column if not exists min_marks_12th      numeric(5,2) default 0,
  add column if not exists allow_backlogs      boolean default true,
  add column if not exists max_backlogs        integer default 0,       -- 0 = no backlogs allowed
  add column if not exists mandatory_skills    text[] default '{}',
  add column if not exists preferred_skills    text[] default '{}',
  add column if not exists custom_questions    jsonb default '[]'::jsonb;
  -- custom_questions format: [{"id": "uuid", "question": "...", "required": true}]

-- Remove old combined salary_range column dependency — keep it for backward compat
-- (salary_range stays; stipend/ctc are the new canonical fields)

-- 2. Update the status constraint to include 'published' (alias for 'open' in new UX)
-- We keep the existing check but add 'published' as a valid value
alter table public.career_opportunities
  drop constraint if exists career_opportunities_status_check;
alter table public.career_opportunities
  add constraint career_opportunities_status_check
    check (status in ('draft', 'published', 'open', 'closed', 'archived'));

-- 3. Table: career_opportunity_scopes
-- Controls which coordinators can manage which opportunities
-- (Super admins bypass this; coordinators are restricted to their assigned departments)
create table if not exists public.career_opportunity_scopes (
  id                uuid primary key default gen_random_uuid(),
  opportunity_id    uuid not null references public.career_opportunities(id) on delete cascade,
  coordinator_id    uuid not null references public.profiles(id) on delete cascade,
  granted_by        uuid references public.profiles(id) on delete set null,
  granted_at        timestamptz default now(),
  unique(opportunity_id, coordinator_id)
);

-- 4. New indexes
create index if not exists idx_career_opps_created_by  on public.career_opportunities(created_by);
create index if not exists idx_career_opps_type        on public.career_opportunities(type);
create index if not exists idx_career_scopes_opp       on public.career_opportunity_scopes(opportunity_id);
create index if not exists idx_career_scopes_coord     on public.career_opportunity_scopes(coordinator_id);

-- 5. RLS for career_opportunity_scopes
alter table public.career_opportunity_scopes enable row level security;

drop policy if exists "Scopes read policy" on public.career_opportunity_scopes;
create policy "Scopes read policy"
  on public.career_opportunity_scopes for select
  using (
    is_super_admin()
    or coordinator_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coordinator')
  );

drop policy if exists "Scopes manage policy" on public.career_opportunity_scopes;
create policy "Scopes manage policy"
  on public.career_opportunity_scopes for all
  using (is_super_admin())
  with check (is_super_admin());

-- 6. Update career_opportunities RLS: coordinators restricted to their departments
drop policy if exists "Career opportunities update policy" on public.career_opportunities;
create policy "Career opportunities update policy"
  on public.career_opportunities for update
  using (
    is_super_admin()
    or auth.uid() = created_by
    or exists (
      select 1 from public.career_opportunity_scopes
      where opportunity_id = id and coordinator_id = auth.uid()
    )
    or (
      -- Coordinator can update if at least one target_department is in their assigned departments
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'coordinator'
      )
      and (
        array_length(target_departments, 1) is null
        or exists (
          select 1 from public.coordinator_departments cd
          where cd.coordinator_id = auth.uid()
            and cd.department_id::text = any(target_departments)
        )
      )
    )
  );

drop policy if exists "Career opportunities delete policy" on public.career_opportunities;
create policy "Career opportunities delete policy"
  on public.career_opportunities for delete
  using (
    is_super_admin()
    or auth.uid() = created_by
  );

