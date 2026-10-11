-- ============================================================
-- Migration: Fix Subject Offerings RLS for Attendance Page
-- Purpose : Allow all authenticated users to read subject_offerings.
--           Previously only teachers assigned to an offering could see it,
--           which broke the Attendance Input page's "Subject Offering"
--           dropdown for teachers not yet assigned or for coordinators
--           viewing all options.
-- ============================================================

-- Drop the old restrictive read policy
drop policy if exists "Academic structure read access" on public.subject_offerings;

-- Re-create with open read access for all authenticated users
-- (subject_offerings is non-sensitive academic metadata, same as subjects/classes)
create policy "Academic structure read access" on public.subject_offerings
  for select to authenticated using (true);

-- The write policy remains restricted to coordinator/super_admin only
-- (no change needed to "Academic structure write access")
