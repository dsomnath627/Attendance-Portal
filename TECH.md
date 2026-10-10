# Technical Architecture & Specification (`TECH.md`)

## 1. Executive Summary & Architecture Overview

**Attendance Portal TIU (Dr. Campus)** is a multi-tenant, role-based academic management portal built with Next.js (App Router), TypeScript, Supabase (PostgreSQL + Auth + RLS), and Google Gemini AI Vision.

The application addresses institutional needs for academic hierarchy management, student roster tracking, attendance verification (via Gemini AI OCR), assessment marks logging, and spreadsheet interchange. 

```
                                 ┌─────────────────────────────────┐
                                 │       Client Browser / Web      │
                                 │   Next.js 14 React Components   │
                                 └────────────────┬────────────────┘
                                                  │
                                                  │ HTTPS / REST / WS
                                                  ▼
                         ┌─────────────────────────────────────────────────┐
                         │              Next.js Server / API               │
                         │   - App Router (Page / Auth Gateway)           │
                         │   - REST API: /api/ocr (Google Gemini Vision)   │
                         └───────────────┬─────────────────┬───────────────┘
                                         │                 │
                Supabase Auth & Database │                 │ Gemini API Request
                                         ▼                 ▼
                         ┌────────────────────────┐  ┌─────────────────────────┐
                         │   Supabase Postgres    │  │ Google Generative AI    │
                         │   - Profiles & Auth    │  │ (Gemini 1.5 Flash)      │
                         │   - RLS Security Model │  └─────────────────────────┘
                         │   - Academic Tables    │
                         └────────────────────────┘
```

---

## 2. Technology Stack & Dependencies

| Component | Technology / Library | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `14.2.35` | Fullstack React framework with SSR & Server APIs |
| **UI Library** | React | `18.3.1` | Component-based UI rendering |
| **Language** | TypeScript | `^5.6.3` | Type-safe JavaScript superset |
| **Backend & Database** | Supabase JS Client | `^2.57.4` | Auth, PostgreSQL database, RLS policies |
| **AI OCR** | `@google/generative-ai` | `^0.24.1` | Gemini 1.5 Flash multimodal vision for code extraction |
| **Client OCR** | Tesseract.js | `^6.0.1` | Fallback browser-side Optical Character Recognition |
| **Spreadsheet Engine** | XLSX (`xlsx`) | `^0.18.5` | Excel workbook parsing & export |
| **Icons** | Lucide React | `^0.468.0` | UI iconography |
| **Styling** | Vanilla CSS / CSS Variables | Standard | Dynamic multi-role color themes & custom layouts |

---

## 3. Data Model & Database Schema

The database is built on Supabase PostgreSQL. Schema creation and management scripts reside in [`supabase/schema.sql`](file:///c:/cpp0pw/CODING/Others/Attendance-Portal_TIU/supabase/schema.sql).

### 3.1 Core Entity Relationship Map

```
   [auth.users] (Supabase Auth)
        │ 1:1
        ▼
   [public.profiles] ◄───────────────────────┐
   (id, email, role, status)                 │
        │                                    │ teacher_id
        ├──────────────────────┐             │ coordinator_id
        │ 1:N                  │ 1:N         │
        ▼                      ▼             │
 [departments]           [academic_years]    │
   │ 1:N                   │ 1:N             │
   ▼                       ▼                 │
 [batches] ──────────► [semesters]           │
   │ 1:N                   │ 1:N             │
   ▼                       ▼                 │
 [classes] ──────────► [subjects]            │
   │                       │                 │
   │ 1:N                   │ 1:N             │
   ▼                       ▼                 │
 [class_enrollments]   [subject_offerings] ──┴──► [routines]
 (student_id, roll)    (teacher_id, class_id)     (day, start, end, room)

 ─── Teacher Workspace Isolated Data Tables (by user_id) ───
  • students (student_id, attendance_code, batch, group_id)
  • assessments (type, max_marks, date) -> marks (assessment_id, student_id, marks)
  • attendance_sessions -> attendance_records (session_id, student_id, status)
  • mark_records (legacy workbook structure with jsonb assessments)
  • workbook_meta (sheet headers metadata)
```

### 3.2 Schema Table Specifications

#### A. User & Profile Management
* **`public.profiles`**:
  * `id` (`uuid`, PK, FK `auth.users.id` ON DELETE CASCADE)
  * `email` (`text`, NOT NULL)
  * `role` (`text`, CHECK: `'super_admin' | 'coordinator' | 'teacher' | 'student'`)
  * `status` (`text`, CHECK: `'pending' | 'approved' | 'rejected' | 'suspended'`)
  * `full_name` (`text`), `avatar_url` (`text`), `bio` (`text`)
  * `created_at`, `updated_at` (`timestamptz`)

#### B. Workspace Data Tables (Teacher Isolated via `user_id`)
* **`public.departments`**: `id` (PK), `user_id` (FK `auth.users.id`), `name`, `code`, `is_active`.
* **`public.batches`**: `id` (PK), `user_id`, `department_id` (FK), `name`, `is_active`.
* **`public.student_groups`**: `id` (PK), `user_id`, `batch_id` (FK), `name`, `is_active`.
* **`public.students`**: `id` (PK), `user_id`, `student_id` (UNIQUE), `name`, `slr`, `department_id`, `batch_id`, `group_id`, `attendance_code`, `batch` (`BCS 2A`..`2D`), `code`, `is_active`.
* **`public.assessments`**: `id` (PK), `user_id`, `department_id`, `batch_id`, `name`, `assessment_type` (default `'LIA'`), `max_marks`, `assessment_date`.
* **`public.attendance_sessions`**: `id` (PK), `user_id`, `attendance_date`, `department_id`, `batch_id`, `group_id`.
* **`public.attendance_records`**: `id` (PK), `user_id`, `session_id` (FK), `student_id` (FK), `status` (`P` | `A`), `detected_code`.
* **`public.marks`**: `id` (PK), `user_id`, `assessment_id` (FK), `student_id` (FK), `marks` (`numeric`).
* **`public.attendance`** (Legacy Excel format): `id` (PK), `user_id`, `student_id`, `batch`, `date`, `status`, `source_name`, `raw_text`.
* **`public.mark_records`** (Legacy Excel workbook format): `id` (PK), `user_id`, `student_id`, `batch`, `assessment_values` (`jsonb`), `lia10` (`jsonb`), `lia16` (`jsonb`), `lab`, `viva`, `total`, `extra` (`jsonb`).
* **`public.workbook_meta`**: `id` (`bigint`), `user_id`, `batch`, `attendance_headers` (`jsonb`), `mark_headers` (`jsonb`).

#### C. Institutional Academic Hierarchy Tables
* **`public.programs`**: `id`, `department_id` (FK), `name`, `level`, `duration_years`.
* **`public.academic_years`**: `id`, `name`, `start_date`, `end_date`, `is_current`.
* **`public.semesters`**: `id`, `name`, `is_active`.
* **`public.classes`**: `id`, `batch_id` (FK), `name`, `is_active`.
* **`public.subjects`**: `id`, `department_id` (FK), `semester_id` (FK), `name`, `code`, `credits` (default `4`), `is_active`.
* **`public.subject_offerings`**: `id`, `subject_id` (FK), `class_id` (FK), `teacher_id` (FK `profiles.id`), `semester_id` (FK), `academic_year_id` (FK), `is_active`.
* **`public.class_enrollments`**: `id`, `student_id` (FK `profiles.id`), `legacy_student_id` (FK `students.id`), `class_id` (FK), `roll_number`.
* **`public.coordinator_departments`**: `id`, `coordinator_id` (FK `profiles.id`), `department_id` (FK `departments.id`).
* **`public.routines`**: `id`, `class_id` (FK), `subject_offering_id` (FK), `teacher_id` (FK `profiles.id`), `day_of_week`, `start_time`, `end_time`, `room`.

---

## 4. Security & Row-Level Security (RLS) Policy

All database tables have Row Level Security enabled. Security is enforced directly inside PostgreSQL, eliminating unauthorized access even if API parameters are tampered with on the client side.

### 4.1 PostgreSQL Helper Function
```sql
create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;
```

### 4.2 Automated Profile Provisioning Trigger
When a user registers via Supabase Auth (`auth.users`), the `on_auth_user_created` trigger automatically provisions a `public.profiles` row:
```sql
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
```

### 4.3 Policy Patterns
1. **Teacher Data Isolation Pattern** (applied to `departments`, `batches`, `student_groups`, `students`, `assessments`, `attendance_sessions`, `attendance_records`, `marks`, `attendance`, `mark_records`, `workbook_meta`):
   ```sql
   create policy "table_isolation" on public.table_name
     for all to authenticated
     using (user_id = auth.uid() or is_super_admin())
     with check (user_id = auth.uid() or is_super_admin());
   ```
2. **Academic Structure Global Read / Restricted Write Pattern** (applied to `programs`, `academic_years`, `semesters`, `classes`, `subjects`, `subject_offerings`, `class_enrollments`, `routines`):
   * **SELECT**: Open to all authenticated users (`using (true)`).
   * **INSERT/UPDATE/DELETE**: Allowed for `super_admin` and `coordinator` roles.

---

## 5. Application Architecture & Component Structure

### 5.1 Route Structure
```
app/
├── layout.tsx         # Root HTML structure & global dynamic styles
├── page.tsx           # Primary auth gateway, profile loader, role routing
├── globals.css        # Core design system tokens, typography, dark/light themes
├── landing/
│   ├── page.tsx       # Institutional marketing & product breakdown page
│   └── landing.css    # Landing page animations & styles
└── api/
    └── ocr/
        └── route.ts   # Next.js Server Route for Gemini AI Vision OCR
```

### 5.2 Client Components Matrix
```
components/
├── Auth.tsx                    # Sign In / Sign Up tabbed form with role selection
├── App.tsx                     # Main layout shell, sidebar, global state & workspace context
├── TeacherDashboard.tsx        # Teacher landing view with assigned offerings & daily routines
├── SubjectPage.tsx             # Detail view per subject offering (Attendance & Marks management)
├── CoordinatorDashboard.tsx    # Academic setup interface (Departments, Classes, Subjects, Routines)
├── StudentDashboard.tsx        # Student landing view with enrolled subjects & attendance %
├── AdminUserVerification.tsx   # Super Admin dashboard (User role toggle, status approval/suspension)
└── MyProfilePage.tsx           # Profile editor for full name, bio, avatar URL
```

---

## 6. AI OCR Pipeline Implementation

The application features a server-side AI OCR endpoint at [`app/api/ocr/route.ts`](file:///c:/cpp0pw/CODING/Others/Attendance-Portal_TIU/app/api/ocr/route.ts) using Google Gemini 1.5 Flash vision.

### 6.1 Process Sequence

```
[User uploads Attendance Sheet Image]
         │
         ▼
[Frontend: POST FormData to /api/ocr]
         │
         ▼
[Server: Read Image ArrayBuffer & Convert to Base64]
         │
         ▼
[Server: Invoke GoogleGenerativeAI("gemini-1.5-flash")]
  Prompt Rules:
   - Identify handwritten/printed 4-digit numbers.
   - Correct OCR character confusions (O->0, I->1, Z->2, S->5, G->6, B->8).
   - Omit year numbers (1900-2100).
   - Output strict JSON format: {"codes": ["1234", "5678"]}
         │
         ▼
[Server: Strip markdown fences & parse JSON]
         │
         ▼
[Frontend: Match returned codes with student attendance_code / enrollment ID]
         │
         ▼
[Frontend: Auto-mark matched students as Present ('P')]
```

---

## 7. Data Synchronization & Workspace Filtering

Super Admin users possess system-level oversight via the top header workspace filter (`selectedTeacherId`).

```typescript
// Query pattern used across data fetches in App.tsx
let query = supabase.from("students").select("*").order("name", { ascending: true });

if (userProfile.role === "super_admin" && selectedTeacherId !== "all") {
  query = query.eq("user_id", selectedTeacherId);
}
```

* **Teachers**: Automatically scoped by Supabase RLS (`user_id = auth.uid()`).
* **Super Admins**: Can view system-wide aggregated totals (`selectedTeacherId = "all"`) or filter down to any specific teacher's workspace (`selectedTeacherId = "<teacher_uuid>"`).

---

## 8. Role-Based Dynamic UI System

The application dynamically modifies UI layout color schemes based on the user's active role using CSS variables injected into the root container:

| Role | Primary Color | Background | Accent |
| :--- | :--- | :--- | :--- |
| **Teacher** | `#450c3f` | `#f5fbda` | `#b9d175` |
| **Student** | `#091540` | `#abd2fa` | `#7692ff` |
| **Coordinator / Admin** | `#111827` | `#f5f7fb` | `#3b82f6` |

---

## 9. Environment Variables Specification

Ensure `.env.local` contains valid API keys for development and production:

```env
# Supabase Configuration (Client-side safe)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Google Gemini API Key (Server-side API route access only)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

---

## 10. Development & Production Deployment Workflow

### 1. Requirements
* Node.js `18.x` or higher
* npm `9.x` or higher

### 2. Local Setup
```bash
git clone <repo-url>
cd Attendance-Portal_TIU
npm install
npm run dev
```

### 3. Production Build & Linting
```bash
npm run build
npm run start
```
