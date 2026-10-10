-- Phase 1 Migration: Security Hardening & Academic Workflow Extensions
-- Run this script in the Supabase SQL Editor to update your existing database.

create extension if not exists pgcrypto;

-- 1. Extend attendance_sessions to link with subject_offerings and classes
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='attendance_sessions' and column_name='subject_offering_id') then
    alter table public.attendance_sessions add column subject_offering_id uuid references public.subject_offerings(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='attendance_sessions' and column_name='class_id') then
    alter table public.attendance_sessions add column class_id uuid references public.classes(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='students' and column_name='profile_id') then
    alter table public.students add column profile_id uuid references public.profiles(id) on delete set null;
  end if;
end $$;

-- 2. Hardened Trigger: Prevent untrusted metadata role elevation and enforce 'pending' status for new registrations
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_role text;
  assigned_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  -- Strict role sanitization: Never trust raw user metadata for admin/coordinator roles
  if requested_role in ('teacher', 'student') then
    assigned_role := requested_role;
  else
    assigned_role := 'student';
  end if;

  insert into public.profiles (id, email, role, status, full_name)
  values (
    new.id,
    new.email,
    assigned_role,
    'pending', -- New registrations require Super Admin approval
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
