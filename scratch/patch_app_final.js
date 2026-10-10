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

// 2. Fetch class_enrollments inside loadAll
if (!code.includes('class_enrollments')) {
  code = code.replace(
    /setStudents\(\s*\(studentsResult\.data as Student\[\]\) \|\| \[\]\s*\);/,
    `$&
    const enrollmentsResult = await supabase.from("class_enrollments").select("*");
    if (!enrollmentsResult.error) {
      setClassEnrollments(enrollmentsResult.data || []);
    }
  `
  );
}

// 3. Update groupStudents logic
const oldGroupStudentsCode = `  const groupStudents = students.filter(
    (s) =>
      s.department_id === department &&
      s.batch_id === batch &&
      s.group_id === group &&
      s.is_active !== false
  );`;

const newGroupStudentsCode = `  const selectedOfferingObj = offerings.find(o => o.id === selectedOffering);
  const selectedClassId = selectedOfferingObj?.class_id;

  const groupStudents = (selectedClassId && classEnrollments.length > 0)
    ? students.filter(s => classEnrollments.some(e => e.class_id === selectedClassId && e.legacy_student_id === s.id))
    : students.filter(
        (s) =>
          s.department_id === department &&
          s.batch_id === batch &&
          s.group_id === group &&
          s.is_active !== false
      );`;

if (code.includes(oldGroupStudentsCode)) {
  code = code.replace(oldGroupStudentsCode, newGroupStudentsCode);
} else {
  console.log("Could not find oldGroupStudentsCode!");
}

// 4. Update the "Attendance Verification" headers
const headerCode = `<p>
                {selectedDepartmentName || "-"} / {selectedBatchName || "-"} / Group {selectedGroupName || "-"} / {date}
              </p>`;
const newHeaderCode = `<p>
                <strong>{selectedOfferingObj?.subjects?.name || "No Subject"} ({selectedOfferingObj?.classes?.name || "No Class"})</strong> | Date: {date}
              </p>`;
if (code.includes(headerCode)) {
  code = code.replace(headerCode, newHeaderCode);
}

// 5. Update validation in saveAttendance
const validationCode = `if (!department || !batch || !group || !date) {
      showError("Department, Batch, Group and Date are required.");
      return;
    }`;
const newValidationCode = `if ((!department || !batch || !group) && !selectedOffering) {
      showError("Department/Batch/Group OR Subject Offering is required.");
      return;
    }
    if (!date) {
      showError("Date is required.");
      return;
    }`;
if (code.includes(validationCode)) {
  code = code.replace(validationCode, newValidationCode);
}

// 6. Update validation in processOCR
const ocrValidationCode = `if (!department || !batch || !group || !date || !file) {
      showError(
        "Select Date, Department, Batch, Group and Attendance Photo."
      );
      return;
    }`;
const newOcrValidationCode = `if ((!department || !batch || !group) && !selectedOffering) {
      showError("Select Date, Subject Offering (or Dept/Batch/Group) and Attendance Photo.");
      return;
    }
    if (!date || !file) {
      showError("Select Date and Attendance Photo.");
      return;
    }`;
if (code.includes(ocrValidationCode)) {
  code = code.replace(ocrValidationCode, newOcrValidationCode);
}

fs.writeFileSync(path, code, 'utf8');
console.log("App.tsx patch final applied successfully.");
