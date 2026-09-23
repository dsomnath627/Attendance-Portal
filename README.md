# Attendance Portal TIU — Multi-Tenant & Role-Based Academic System

A modern, Vercel/Netlify-ready **Next.js + Supabase** web application designed with **per-user data isolation (Multi-Tenancy)** and **Role-Based Access Control (RBAC)** for academic attendance and marks management.

---

## 🌟 Key Highlights & Security Architecture

1. **User Separation & Data Isolation**:
   - **Teachers** can only see, create, and manage their own academic workspace (departments, batches, student groups, student rosters, attendance sessions, marks, and Excel workbook imports).
   - **Strict Data Segregation**: Every database row is linked to a `user_id` (`auth.users.id`), and access is strictly controlled at the database level via Postgres **Row Level Security (RLS)**.

2. **Super Admin Role & System Oversight**:
   - **Super Admin Panel**: A dedicated administrative dashboard to view all registered system users (Teachers & Super Admins), monitor system-wide statistics, and promote/demote user roles.
   - **Workspace Filter Switcher**: Super Admins can switch between viewing system-wide aggregated data or filtering workspace data by any specific teacher.

3. **Smart Features**:
   - OCR-assisted student attendance verification via Tesseract.js (browser-based last 4-digit matching).
   - Full Excel workbook import and export (.xlsx).
   - Flexible academic hierarchy (Departments → Batches → Student Groups → Students → Assessments).

---

## 🏗️ Technical Architecture & Data Model

### 1. Database Schema (`supabase/schema.sql`)

```
                          ┌──────────────────────────┐
                          │   auth.users (Supabase)  │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │     public.profiles      │
                          │  (id, email, role, name) │
                          └─────────────┬────────────┘
                                        │
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         PUBLIC DATA TABLES                                  │
 │   (departments, batches, student_groups, students, assessments,             │
 │    attendance_sessions, attendance_records, marks, mark_records, etc.)      │
 │                                                                             │
 │   * Every table includes: user_id uuid references auth.users(id)            │
 └─────────────────────────────────────────────────────────────────────────────┘
```

#### Roles:
- `'teacher'`: Default role assigned automatically upon registration via database trigger (`on_auth_user_created`).
- `'super_admin'`: System admin role with global read/write access and user management privileges.

---

## 🛡️ Row Level Security (RLS) Policies

All public tables have Row Level Security enabled. The RLS policies enforce isolation:

### Postgres Helper Function (`is_super_admin`):
```sql
create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;
```

### Table Isolation Policy Pattern:
```sql
create policy "table_name_isolation" on public.table_name
  for all to authenticated
  using (user_id = auth.uid() or is_super_admin())
  with check (user_id = auth.uid() or is_super_admin());
```

> **Why this matters**: Even if an API request attempts to request or tamper with another teacher's data ID, Supabase RLS will drop/reject the operation at the Postgres engine level.

---

## 🚀 Setup & Installation Guide

### Step 1: Create Supabase Project
1. Log in to [Supabase](https://supabase.com/) and create a new project.
2. Go to **SQL Editor** -> **New Query**.
3. Copy the complete contents of [`supabase/schema.sql`](file:///c:/cpp0pw/CODING/Others/Attendance-Portal_TIU/supabase/schema.sql) and click **Run**.

### Step 2: Create the Initial Super Admin User
1. Go to **Authentication** -> **Users** in your Supabase dashboard and create a new account (or register via the web app login screen).
2. Go to **SQL Editor** and run the following query to elevate your user to `super_admin`:

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

### Step 3: Local Environment Setup
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

> ⚠️ **Security Warning**: Do NOT expose your Supabase `service_role` secret key in client-side code. The anon key combined with RLS provides complete security.

### Step 4: Run Locally
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 User Workflows

### 👨‍🏫 Teacher Workflow:
1. **Registration**: Sign up via the **Register Teacher** tab on the login screen.
2. **Setup**: Add Departments, Batches, and Student Groups.
3. **Student Roster**: Add students manually or import from an Excel sheet.
4. **Attendance**: Upload attendance sheet image for OCR processing or take manual attendance.
5. **Marks**: Enter assessment scores and export reports to Excel.

### ⚡ Super Admin Workflow:
1. Log in with a `super_admin` account.
2. Access the **Admin Panel** tab in the sidebar navigation.
3. View all registered teachers, full names, emails, and user IDs.
4. Promote or demote user roles (`Teacher` ↔ `Super Admin`).
5. Use the **Filter Workspace Data** dropdown in the top header to inspect workspace data for any specific teacher or view system-wide data.

---

## 🌐 Deployment (Vercel & Netlify)

1. Push your repository to GitHub.
2. Import the project into **Vercel** or **Netlify**.
3. Add environment variables under Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

