const fs = require('fs');
const path = 'components/App.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add classEnrollments state safely
if (!code.includes('const [classEnrollments')) {
  code = code.replace(
    /const \[students, setStudents\] = useState<Student\[\]>\(\[\]\);/,
    'const [students, setStudents] = useState<Student[]>([]);\n  const [classEnrollments, setClassEnrollments] = useState<any[]>([]);'
  );
}

// 2. Fetch class_enrollments safely inside loadAll
if (!code.includes('class_enrollments')) {
  // Find where setAssessments is called inside loadAll and append classEnrollments fetch
  code = code.replace(
    /setAssessments\(\s*\(assessmentsResult\.data as Assessment\[\]\) \|\| \[\]\s*\);/,
    `$&
    const enrollmentsResult = await supabase.from("class_enrollments").select("*");
    if (!enrollmentsResult.error) {
      setClassEnrollments(enrollmentsResult.data || []);
    }
  `
  );
}

// 3. Update groupStudents safely
const groupStudentsDef = `
  const selectedOfferingObj = offerings.find(o => o.id === selectedOffering);
  const selectedClassId = selectedOfferingObj?.class_id;

  const groupStudents = (selectedClassId && classEnrollments.length > 0)
    ? students.filter(s => classEnrollments.some(e => e.class_id === selectedClassId && e.legacy_student_id === s.id))
    : students.filter(
    (s) =>
      s.department_id === department &&
      s.batch_id === batch &&
      s.group_id === group &&
      s.is_active !== false
  );
`;

const oldGroupStudentsRegex = /const groupStudents = students\.filter\(\s*\(s\) =>\s*s\.department_id === department &&\s*s\.batch_id === batch &&\s*s\.group_id === group &&\s*s\.is_active !== false\s*\);/g;

if (code.match(oldGroupStudentsRegex)) {
  code = code.replace(oldGroupStudentsRegex, groupStudentsDef);
} else {
  console.log("Could not find groupStudents regex!");
}

// 4. Update Header
const headerRegex = /<p>[\s]*\{selectedDepartmentName \|\| "-"\} \/ \{selectedBatchName \|\| "-"\} \/ Group \{selectedGroupName \|\| "-"\} \/ \{date\}[\s]*<\/p>/;
const headerReplace = `<p>
                <strong>{selectedOfferingObj?.subjects?.name || "No Subject"} ({selectedOfferingObj?.classes?.name || "No Class"})</strong> | Date: {date}
              </p>`;
if (code.match(headerRegex)) {
  code = code.replace(headerRegex, headerReplace);
} else {
  console.log("Could not find header regex!");
}

// 5. Update saveAttendance payload
const sessionInsertRegex = /const sessionInsertData = \{\s*attendance_date: date,\s*department_id: department,\s*batch_id: batch,\s*group_id: group,\s*user_id: user\.id,\s*\};/g;
const sessionInsertReplace = `const sessionInsertData = {
        attendance_date: date,
        department_id: department || null,
        batch_id: batch || null,
        group_id: group || null,
        subject_offering_id: selectedOffering || null,
        class_id: selectedClassId || null,
        user_id: user.id,
      };`;
if (code.match(sessionInsertRegex)) {
  code = code.replace(sessionInsertRegex, sessionInsertReplace);
} else {
  console.log("Could not find sessionInsertData regex!");
}

// 6. Update validation check
const validationRegex = /if \(!department \|\| !batch \|\| !group \|\| !date \|\| !file\) \{/g;
const validationReplace = `if ((!department || !batch || !group) && !selectedOffering) { showError("Select either Department/Batch/Group OR Subject Offering."); return; } if (!date || !file) {`;
if (code.match(validationRegex)) {
  code = code.replace(validationRegex, validationReplace);
  code = code.replace(/showError\(\s*"Select Date, Department, Batch, Group and Attendance Photo\."\s*\);/, 'showError("Select Date, and Attendance Photo.");');
}

fs.writeFileSync(path, code, 'utf8');
console.log("Safe patch applied successfully.");
