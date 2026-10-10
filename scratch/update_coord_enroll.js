const fs = require('fs');

const path = 'c:\\cpp0pw\\CODING\\Others\\Attendance-Portal_TIU\\components\\CoordinatorDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Rewrite saveEnrollment function
const oldSaveEnrollmentRegex = /async function enrollStudent\(\) \{[\s\S]*?loadAllData\(\);\s*\}/;
const newSaveEnrollment = `async function enrollStudent() {
    if (!enrollStudentId || !enrollClassId) { showError?.("Student and Class are required."); return; }
    if (enrollments.find(e => e.legacy_student_id === enrollStudentId && e.class_id === enrollClassId)) {
      showError?.("Student is already enrolled in this class."); return;
    }
    setFormLoading(true);
    // enrollStudentId now refers to rosterStudent.id (which goes to legacy_student_id)
    const { error } = await supabase.from("class_enrollments").insert([{ legacy_student_id: enrollStudentId, class_id: enrollClassId, roll_number: enrollRoll }]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.("Student enrolled in class."); resetForms(); loadAllData(); }
  }`;

if (code.match(oldSaveEnrollmentRegex)) {
  code = code.replace(oldSaveEnrollmentRegex, newSaveEnrollment);
} else {
  console.log("Could not find enrollStudent function with regex.");
  // try finding by saveEnrollment instead
  const altRegex = /async function saveEnrollment\(\) \{[\s\S]*?loadAllData\(\);\s*\}/;
  if (code.match(altRegex)) {
    code = code.replace(altRegex, newSaveEnrollment.replace('enrollStudent', 'saveEnrollment'));
  } else {
    // maybe it's called something else, let's replace manually by looking at lines
    console.log("Could not find enroll function.");
  }
}

// 2. Update the students map in the select dropdown
code = code.replace(
  '{students.map(st => <option key={st.id} value={st.id}>{st.full_name || st.email}</option>)}',
  '{rosterStudents.map(st => <option key={st.id} value={st.id}>{st.name} ({st.student_id})</option>)}'
);

// 3. Update the display of enrolled students in the grid-list
const oldEnrollmentCardRegex = /const st = students\.find\(s => s\.id === e\.student_id\);[\s\S]*?<\/div>/;
const newEnrollmentCard = `const st = rosterStudents.find(s => s.id === e.legacy_student_id);
                  const cls = classes.find(c => c.id === e.class_id);
                  return (
                    <div key={e.id} className="item-card">
                      <div className="actions">
                        <button className="icon-btn delete" onClick={() => deleteRecord('class_enrollments', e.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-title">{st?.name || "Unknown Student"}</div>
                      <div className="item-sub"><strong>Class:</strong> {cls?.name || "N/A"}</div>
                      <div className="item-sub"><strong>Roll:</strong> {e.roll_number || "N/A"} | <strong>ID:</strong> {st?.student_id || "N/A"}</div>
                    </div>`;

if (code.match(oldEnrollmentCardRegex)) {
  code = code.replace(oldEnrollmentCardRegex, newEnrollmentCard);
} else {
  console.log("Could not find enrollment card with regex. Trying string replacement.");
  code = code.replace('const st = students.find(s => s.id === e.student_id);', 'const st = rosterStudents.find(s => s.id === e.legacy_student_id);');
  code = code.replace('{st?.full_name || st?.email || "Unknown Student"}', '{st?.name || "Unknown Student"}');
  code = code.replace('{e.roll_number || "N/A"}', '{e.roll_number || "N/A"} | <strong>ID:</strong> {st?.student_id || "N/A"}');
}

fs.writeFileSync(path, code, 'utf8');
console.log('Script updated with Class Enrollment modifications.');
