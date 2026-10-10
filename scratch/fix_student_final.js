const fs = require('fs');
const path = 'components/StudentDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace fetch logic
const fetchRegex = /\/\/\s*3\.\s*Fetch routine schedule for student's class[\s\S]*?setTodayClasses\(classList\);\s*\}/;
const fetchReplace = `        // 3. Fetch all routine schedules for student's class
        const { data: routines } = await supabase
          .from("routines")
          .select(\`
            id,
            day_of_week,
            start_time,
            end_time,
            room,
            subject_offerings (
              subjects (name),
              profiles (full_name, email)
            )
          \`)
          .eq("class_id", classId);

        if (routines) {
          const classList: RoutineEntry[] = routines.map((r: any) => ({
            id: r.id,
            day_of_week: r.day_of_week,
            start_time: r.start_time,
            end_time: r.end_time,
            room: r.room || "TBA",
            subject_name: r.subject_offerings?.subjects?.name || "Subject",
            class_name: "My Class",
            teacher_name: r.subject_offerings?.profiles?.full_name || r.subject_offerings?.profiles?.email || "Teacher",
          }));
          setStudentRoutines(classList);
        }`;

code = code.replace(fetchRegex, fetchReplace);

// Replace UI block
const uiRegex = /\{\/\*\s*TODAY'S CLASSES\s*\*\/\}[\s\S]*?<\/div>\s*\{\/\*\s*ENROLLED SUBJECTS\s*\*\/\}/;
const uiReplace = `{/* TIMETABLE / CALENDAR */}
      <div style={{ marginTop: "32px" }}>
        <CalendarTimetable routines={studentRoutines} role="student" />
      </div>

      {/* ENROLLED SUBJECTS */}`;

code = code.replace(uiRegex, uiReplace);

// Also remove `TodayClass` type if not used elsewhere, to avoid unused errors.
const typeRegex = /type TodayClass = \{[\s\S]*?\};\r?\n/;
code = code.replace(typeRegex, '');

fs.writeFileSync(path, code, 'utf8');
console.log('StudentDashboard final patch complete.');
