const fs = require('fs');
const path = 'components/StudentDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('import CalendarTimetable')) {
  code = code.replace(
    'import SubjectPage from "./SubjectPage";',
    'import SubjectPage from "./SubjectPage";\nimport CalendarTimetable, { RoutineEntry } from "./CalendarTimetable";'
  );
}

// 1. Replace state
code = code.replace(
  'const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);',
  'const [studentRoutines, setStudentRoutines] = useState<RoutineEntry[]>([]);'
);

// 2. Replace fetching logic
const fetchTarget = `        // 3. Fetch routine schedule for student's class
        const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
        const { data: routines } = await supabase
          .from("routines")
          .select(\`
            id,
            day_of_week,
            start_time,
            end_time,
            room,
            subject_offerings (
              subjects (name)
            )
          \`)
          .eq("class_id", classId)
          .eq("day_of_week", dayName);

        if (routines) {
          const classList: TodayClass[] = routines.map((r: any) => ({
            id: r.id,
            subject_name: r.subject_offerings?.subjects?.name || "Subject",
            start_time: r.start_time,
            end_time: r.end_time,
            room: r.room || "Room 101",
          }));
          setTodayClasses(classList);
        }`;

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

if (code.includes(fetchTarget)) {
  code = code.replace(fetchTarget, fetchReplace);
} else {
  console.log("Fetch target not found!");
}

// 3. Replace UI
const uiTarget = `      {/* TIMETABLE / TODAY */}
      <div className="section-title" style={{ marginTop: "32px" }}>
        <Clock size={20} color="#450c3f" /> TODAY'S CLASSES
      </div>
      <div className="dashboard-grid">
        {todayClasses.length === 0 ? (
          <div style={{ color: "#6b7280", padding: "16px 0", gridColumn: "1 / -1" }}>No classes scheduled for today.</div>
        ) : (
          todayClasses.map((cls) => (
            <div key={cls.id} className="stat-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ display: "block", fontSize: "1.1rem", color: "#111827", marginBottom: "4px" }}>
                  {cls.subject_name}
                </strong>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  {cls.start_time} - {cls.end_time}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#450c3f" }}>{cls.room}</div>
              </div>
            </div>
          ))
        )}
      </div>`;

const uiReplace = `      {/* TIMETABLE / CALENDAR */}
      <div style={{ marginTop: "32px" }}>
        <CalendarTimetable routines={studentRoutines} role="student" />
      </div>`;

if (code.includes(uiTarget)) {
  code = code.replace(uiTarget, uiReplace);
} else {
  console.log("UI target not found! Using regex fallback...");
  const regex = /\{\/\* TIMETABLE \/ TODAY \*\/\}[\s\S]*?<\/div>\s*<\/div>/;
  code = code.replace(regex, uiReplace);
}

fs.writeFileSync(path, code, 'utf8');
console.log('StudentDashboard patched.');
