const fs = require('fs');
const path = 'c:\\cpp0pw\\CODING\\Others\\Attendance-Portal_TIU\\components\\CoordinatorDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// Fix 1: Extra }
code = code.replace(/loadAllData\(\); \}\n  \}\n\n  async function saveRoutineEntry\(\) \{/, 'loadAllData(); }\n  }\n\n  async function saveRoutineEntry() {');
// Wait, regex might fail on spaces.
code = code.replace('loadAllData(); }\n  }\n  \n  async function saveRoutineEntry() {', 'loadAllData(); }\n  }\n\n  async function saveRoutineEntry() {');

// A better way to remove the extra brace:
let lines = code.split('\\n');
// Because windows uses \r\n, let's split by \r?\n
lines = code.split(/\r?\n/);
let inEnrollStudent = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function enrollStudent() {')) {
     inEnrollStudent = true;
  }
  if (inEnrollStudent && lines[i] === '  }' && lines[i+1] === '  }') {
     lines.splice(i+1, 1);
     inEnrollStudent = false;
     break;
  }
}

// Fix 2: Enrollment list
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const st = students.find(s => s.id === en.student_id);')) {
     lines[i] = lines[i].replace('students.find(s => s.id === en.student_id)', 'rosterStudents.find(s => s.id === en.legacy_student_id)');
  }
  if (lines[i].includes('{st?.full_name || st?.email}')) {
     lines[i] = lines[i].replace('{st?.full_name || st?.email}', '{st?.name || "Unknown Student"}');
  }
  if (lines[i].includes('Class: {c?.name} | Roll: {en.roll_number || "N/A"}')) {
     lines[i] = lines[i].replace('Class: {c?.name} | Roll: {en.roll_number || "N/A"}', 'Class: {c?.name} | Roll: {en.roll_number || "N/A"} | ID: {st?.student_id || "N/A"}');
  }
}

fs.writeFileSync(path, lines.join('\\n'), 'utf8');
console.log('Fixed');
