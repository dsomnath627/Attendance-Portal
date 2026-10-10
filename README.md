# Attendance Portal TIU (Dr. Campus) — Multi-Tenant & Role-Based Academic System

A modern, production-ready **Next.js 14 + Supabase** academic web application featuring **per-user data isolation (Multi-Tenancy)**, **Role-Based Access Control (RBAC)**, **AI-powered OCR attendance verification (Google Gemini Vision)**, and **Excel workbook management**.

---
## 🌟 Key Highlights & Security Architecture

### 1. 👥 Multi-Role Academic Platform
* **Super Admin**: System-wide administrative oversight, user management & verification (approve, reject, suspend, promote/demote user roles), and global workspace filtering across all registered teachers.
* **Coordinator**: Institutional structure management, defining Departments, Academic Years, Semesters, Programs, Batches, Classes, Subjects, Subject Offerings (teacher assignment), and Class Routines/Timetables.
* **Teacher**: Dedicated dashboard listing assigned subjects, class schedules, manual/AI attendance intake, assessment score tracking, student roster management, and Excel sheet exports.
* **Student**: Personalized portal showing enrolled subjects, attendance percentages, daily routines, class schedules, and academic assessment results.

### 2. 🤖 AI-Powered OCR Attendance Verification
* **Server-side Vision AI**: Integrates Google Gemini 1.5 Flash via Next.js Server Route ([`app/api/ocr/route.ts`](file:///c:/cpp0pw/CODING/Others/Attendance-Portal_TIU/app/api/ocr/route.ts)) to read handwritten or printed 4-digit enrollment codes from uploaded attendance sheet photos.
* **Automated Roll Matcher**: Automatically extracts student attendance codes, handles common OCR character confusions (e.g., `O` $\rightarrow$ `0`, `I` $\rightarrow$ `1`), and marks matching students as Present (`P`) in real time.
* **Browser OCR Fallback**: Integrated client-side Tesseract.js engine for offline or client-side text processing.

### 3. 🔒 Robust Security & Multi-Tenant Data Isolation
* **Database-Level Protection**: Built on PostgreSQL **Row Level Security (RLS)** in Supabase. Every teacher's workspace data is strictly segregated using `user_id = auth.uid()`.
* **Super Admin Override**: Custom PostgreSQL function `is_super_admin()` allows administrators global read/write privileges without compromising row-level checks for standard users.
* **Account Status Guard**: New signups undergo role and status verification (`approved`, `pending`, `rejected`, `suspended`). Non-approved accounts are automatically blocked at the authentication gateway.

### 4. 📊 Excel Import / Export System
* Full `.xlsx` spreadsheet integration powered by `xlsx` (SheetJS).
* Import student rosters and marks directly into database JSON schemas (`mark_records`, `workbook_meta`).
* Export comprehensive attendance reports and assessment sheets to Excel with a single click.

---

## 🏗️ Technical Architecture & Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Backend & Auth** | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| **AI OCR** | Google Generative AI (`@google/generative-ai` - Gemini 1.5 Flash) |
| **Spreadsheet Handling** | `xlsx` |
| **Icons & Styling** | Lucide React, Custom CSS Design System with Role-Based Palette Variables |

> 📌 **For in-depth architecture diagrams, data models, RLS policies, and API specifications, see [`TECH.md`](file:///c:/cpp0pw/CODING/Others/Attendance-Portal_TIU/TECH.md).**

---

## 🚀 Setup & Installation Guide

### Step 1: Clone & Install Dependencies

```bash
git clone <repository-url>
cd Attendance-Portal_TIU
npm install
```

### Step 2: Supabase Project Setup

1. Create a project at [Supabase.com](https://supabase.com/).
2. Navigate to **SQL Editor** $\rightarrow$ **New Query**.
3. Copy the entire contents of [`supabase/schema.sql`](file:///c:/cpp0pw/CODING/Others/Attendance-Portal_TIU/supabase/schema.sql) and click **Run**.
4. (Optional) Run [`supabase/seed_demo.sql`](file:///c:/cpp0pw/CODING/Others/Attendance-Portal_TIU/supabase/seed_demo.sql) to populate initial demo data.

### Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Gemini AI API Key (Required for AI OCR feature)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> ⚠️ **Note**: Do NOT commit `.env.local` or expose your Supabase `service_role` key to the frontend.

### Step 4: Provision Initial Super Admin User

1. Register an account through the app UI or via Supabase Auth.
2. In Supabase **SQL Editor**, elevate the user's role:

```sql
UPDATE public.profiles
SET role = 'super_admin', status = 'approved'
WHERE email = 'admin@example.com';
```

### Step 5: Start Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Role & Workflow Overview

```
                      ┌─────────────────────────┐
                      │    Registration/Login   │
                      └────────────┬────────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
      [Super Admin]          [Coordinator]           [Teacher]
   - Verify Users         - Manage Depts        - View Routine
   - Role Promotion       - Setup Classes       - Take Attendance
   - Switch Workspace     - Assign Subjects     - AI OCR Scan
   - Global Oversight     - Schedule Routines   - Marks Entry & Export
                                                         │
                                                         ▼
                                                     [Student]
                                                - View Attendance %
                                                - Check Today's Routine
                                                - View Subject Marks
```

---

## 📂 Project Structure

```
Attendance-Portal_TIU/
├── app/
│   ├── api/ocr/route.ts      # Server API Route for Gemini AI OCR
│   ├── landing/              # Marketing & Product Landing Page
│   │   ├── landing.css
│   │   └── page.tsx
│   ├── globals.css           # Global Design System & Dynamic Tokens
│   ├── layout.tsx            # Root App Layout
│   └── page.tsx              # Auth Gateway & Main View Dispatcher
├── components/
│   ├── AdminUserVerification.tsx # Super Admin User Management Dashboard
│   ├── App.tsx                   # Core Application Layout & State Manager
│   ├── Auth.tsx                  # Login / Registration Modal Component
│   ├── CoordinatorDashboard.tsx  # Academic Hierarchy & Timetable Setup
│   ├── MyProfilePage.tsx         # User Profile Editor
│   ├── StudentDashboard.tsx      # Student Portal View
│   ├── SubjectPage.tsx           # Subject-Specific Attendance & Marks Management
│   └── TeacherDashboard.tsx      # Teacher Workstation Dashboard
├── lib/
│   └── supabase.ts           # Supabase Client Initializer
├── supabase/
│   ├── schema.sql            # Complete Database DDL, Triggers, & RLS Policies
│   └── seed_demo.sql         # Seed Script for Testing
├── package.json              # Project Dependencies & Scripts
├── README.md                 # Project Overview & Setup Guide
└── TECH.md                   # Technical Architecture & API Documentation
```

---

## 🌐 Deployment Instructions

### Vercel / Netlify
1. Push repository to GitHub/GitLab.
2. Import repository into **Vercel** or **Netlify**.
3. Set build command to `npm run build` and output directory to `.next`.
4. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`).
5. Trigger Deployment.

---

## 📄 License & Attribution

Developed for **Techno India University (TIU)** academic management. Built with Next.js, Supabase, and Google Gemini AI.
