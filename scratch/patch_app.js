const fs = require('fs');
const path = 'components/App.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add classEnrollments state
if (!code.includes('const [classEnrollments')) {
  code = code.replace(
    /const \[students, setStudents\] = useState<Student\[\]>\(\[\]\);/,
    'const [students, setStudents] = useState<Student[]>([]);\n  const [classEnrollments, setClassEnrollments] = useState<any[]>([]);'
  );
}

// 2. Fetch class_enrollments in loadAll
const fetchRegex = /const \[.*?\] = await Promise\.all\(\[/;
const fetchReplace = `const [
      departmentsResult,
      batchesResult,
      groupsResult,
      studentsResult,
      assessmentsResult,
      enrollmentsResult
    ] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("batches").select("*").order("name"),
      supabase.from("student_groups").select("*").order("name"),
      supabase.from("students").select("*").order("name"),
      supabase.from("assessments").select("*").order("name"),
      supabase.from("class_enrollments").select("*")
    ]);
`;

// It's safer to just inject the fetch after studentsResult.
const loadAllTarget = `const studentsResult = await supabase.from("students").select("*").order("name");`;
// Wait, I don't know if they are fetched in Promise.all or sequentially. Let me find out how students are fetched.
// I will use regex to find where studentsResult is defined and append enrollmentsResult.
code = code.replace(
  /const studentsResult = await supabase\.from\("students"\)\.select\("\*"\)\.order\("name"\);/g,
  'const studentsResult = await supabase.from("students").select("*").order("name");\n    const enrollmentsResult = await supabase.from("class_enrollments").select("*");'
);

code = code.replace(
  /setStudents\([\s\S]*?\);/g,
  `$&
    if (!enrollmentsResult?.error) setClassEnrollments(enrollmentsResult?.data || []);
  `
);

// 3. Define enrolledStudents logic
const groupStudentsRegex = /const groupStudents = students\.filter\([\s\S]*?s\.group_id === group\s*\);/g;
const newGroupStudents = `
  const selectedOfferingObj = offerings.find(o => o.id === selectedOffering);
  const selectedClassId = selectedOfferingObj?.class_id;
  
  const groupStudents = (selectedClassId && classEnrollments.length > 0)
    ? students.filter(s => classEnrollments.some(e => e.class_id === selectedClassId && e.legacy_student_id === s.id))
    : students.filter((s) => s.group_id === group);
`;

if (code.match(groupStudentsRegex)) {
  code = code.replace(groupStudentsRegex, newGroupStudents);
} else {
  // Try another variation
  const fallbackRegex = /const groupStudents =\s*group\s*\?\s*students\.filter\(\(s\) => s\.group_id === group\)\s*:\s*\[\];/g;
  code = code.replace(fallbackRegex, newGroupStudents);
}

// 4. Update the "Attendance Verification" headers and UI
const attendanceHeaderRegex = /<p>[\s\S]*?\{selectedDepartmentName \|\| "-"\} \/ \{selectedBatchName \|\| "-"\} \/ Group \{selectedGroupName \|\| "-"\} \/ \{date\}[\s\S]*?<\/p>/g;
const attendanceHeaderReplace = `<p>
                <strong>{selectedOfferingObj?.subjects?.name || "No Subject"} ({selectedOfferingObj?.classes?.name || "No Class"})</strong> | Date: {date}
              </p>`;
if (code.match(attendanceHeaderRegex)) {
  code = code.replace(attendanceHeaderRegex, attendanceHeaderReplace);
}

// 5. Update saveAttendance to save subject_offering_id and class_id correctly!
// Right now, saveAttendance probably inserts department_id, batch_id, group_id into attendance_sessions.
// We must insert subject_offering_id and class_id!
const sessionInsertRegex = /const sessionInsertData = \{[\s\S]*?attendance_date: date,[\s\S]*?department_id: department,[\s\S]*?batch_id: batch,[\s\S]*?group_id: group,[\s\S]*?\};/g;
const sessionInsertReplace = `const sessionInsertData = {
        attendance_date: date,
        department_id: department || null,
        batch_id: batch || null,
        group_id: group || null,
        subject_offering_id: selectedOffering || null,
        class_id: selectedClassId || null,
        created_by: user.id,
      };`;
if (code.match(sessionInsertRegex)) {
  code = code.replace(sessionInsertRegex, sessionInsertReplace);
}

// We need to require selectedOffering
const validationRegex = /if \(!department \|\| !batch \|\| !group \|\| !date \|\| !file\) \{/g;
const validationReplace = `if (!selectedOffering || !date || !file) {`;
if (code.match(validationRegex)) {
  code = code.replace(validationRegex, validationReplace);
  
  // also update the showError message
  code = code.replace(/showError\([\s\S]*?"Select Date, Department, Batch, Group and Attendance Photo."[\s\S]*?\);/, 'showError("Select Date, Subject Offering, and Attendance Photo.");');
}

fs.writeFileSync(path, code, 'utf8');
console.log('App.tsx patched for Attendance.');
