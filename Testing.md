# Testing Guide for Attendance Portal TIU

This guide provides a comprehensive checklist to verify the core academic, attendance, marks, and excel workflows.

## Environment & Setup

1. **Environment Variables**:
   Ensure `.env.local` is present in your project root and contains valid Supabase keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
   
2. **Database Migration**:
   Run the SQL scripts in the Supabase SQL editor:
   - `supabase/schema.sql` (Base Schema)
   - `supabase/migration_attendance.sql` (Attendance Schema update)
   - `supabase/migration_marks_excel.sql` (Marks & Assessments Schema update)

3. **Build Readiness**:
   - Run `npm run build` to ensure there are no TypeScript or Next.js build errors.
   - Run `npm run start` to start the local server in production mode for testing.

---

## 1. Authentication & Role Management

- **Sign Up**: Register a new user. The system assigns a 'pending' student profile by default.
- **Super Admin Oversight**: Log in as the Super Admin, navigate to user management, and approve the pending user, optionally elevating their role to `teacher` or `coordinator`.
- **Role Isolation**:
  - `student`: Can only view their own attendance, marks, and classes.
  - `teacher`: Can only view and manage subject offerings assigned to them.
  - `coordinator`: Has full control over assigned department's curriculum.
  - `super_admin`: Has full access to everything.

---

## 2. Core Academic Setup (Coordinator)

As a `coordinator` or `super_admin`:
1. Navigate to the **Coordinator Dashboard**.
2. **Departments & Programs**: Create a test Department and Program.
3. **Academic Context**: Add a current Academic Year and Semester.
4. **Subjects & Classes**: Create a new Subject (with credit hours) and a new Class.
5. **Subject Offering**: Create a new Subject Offering linking the Class to a Subject and assigning a Teacher.

---

## 3. Student Enrollment

1. Create a `student` profile.
2. Link the student profile to the Class created in Step 2.
3. Verify that the student is visible in the class roster on the coordinator's side.

---

## 4. Attendance Workflow

As the assigned `teacher`:
1. Go to the **Subject Page** for the assigned subject offering.
2. Select the **Attendance** tab.
3. Start a new attendance session for the current date.
4. Mark students as Present (P) or Absent (A).
5. Ensure you cannot create duplicate sessions for the same date and offering.

As a `student`:
1. Navigate to **My Profile** or **Student Dashboard**.
2. Check the attendance percentage for the subject offering. Ensure it accurately reflects the marked data.

---

## 5. Assessments & Marks Workflow

As the assigned `teacher`:
1. Go to the **Marks** tab inside the Subject Page.
2. **Create Assessment**: Enter a name (e.g., "Midterm"), Max Marks (e.g., "50"), and Date.
3. Select the assessment and enter marks for the enrolled students.
4. Validate inputs (e.g., marks cannot exceed max marks, only numbers are allowed).

As a `student`:
1. Go to the **Subject Page** -> **Marks** tab.
2. Verify that only your own score is visible and accurate.

---

## 6. Excel Import / Export

1. **Export Class Roster**: Download the `.xlsx` roster. Check that columns like `Student ID`, `Name`, `Subject`, `Class`, and `Date` are properly formatted.
2. **Export Attendance/Marks**: Download the assessment sheet or attendance summaries.
3. **Import Preview**: (If importing is implemented) When importing an Excel file for attendance or marks, the system should show a preview of data before committing to the database.

---

## 7. UI / UX Edge Cases

- **Loading States**: Check for spinner/loading text while fetching data.
- **Empty States**: Look for friendly messages when there are no subjects, no students, or no assessments yet.
- **Confirmation Dialogs**: Try deleting an assessment to see if a prompt confirms the action.
- **Error Messages**: Disconnect the internet and try saving marks. Ensure a clear error message is shown.

---
**Note:** The system is considered demo-ready once all the above tests pass successfully in a clean environment.
