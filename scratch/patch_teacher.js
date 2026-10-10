const fs = require('fs');
const path = 'components/TeacherDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('import CalendarTimetable')) {
  code = code.replace(
    'import SubjectPage from "./SubjectPage";',
    'import SubjectPage from "./SubjectPage";\nimport CalendarTimetable from "./CalendarTimetable";'
  );
}

const targetDiv = `<div className="routine-table-card">
        <div className="section-title">
          <Clock size={20} color="#450c3f" /> MY WEEKLY TEACHING SCHEDULE
        </div>
        {teacherRoutines.length === 0 ? (
          <div style={{ color: "#6b7280", padding: "16px 0" }}>No teaching schedule entry configured yet.</div>
        ) : (
          <div>
            {teacherRoutines.map((r) => (
              <div key={r.id} className="routine-row">
                <div>
                  <strong style={{ color: "#111827" }}>{r.day_of_week}</strong>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                    {r.subject_name} ({r.class_name})
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, color: "#450c3f" }}>{r.start_time} - {r.end_time}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>📍 {r.room}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>`;

const replacementDiv = `<CalendarTimetable routines={teacherRoutines} role="teacher" />`;

code = code.replace(targetDiv, replacementDiv);
fs.writeFileSync(path, code, 'utf8');
console.log('TeacherDashboard patched.');
