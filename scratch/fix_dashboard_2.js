const fs = require('fs');
const path = 'c:\\cpp0pw\\CODING\\Others\\Attendance-Portal_TIU\\components\\CoordinatorDashboard.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  // Fix 1: Add legacy_student_id
  if (lines[i].includes('type ClassEnrollment = { id: string; student_id: string; class_id: string; roll_number?: string };')) {
    lines[i] = 'type ClassEnrollment = { id: string; student_id: string; legacy_student_id?: string; class_id: string; roll_number?: string };';
  }
  
  // Fix 2: loadAllData array missing rosterRes
  if (lines[i].includes('classRes, subjRes, offeringRes, profileRes, enrollRes, routRes,')) {
    // If it already has rosterRes, skip. Otherwise add it.
    if (!lines[i].includes('rosterRes')) {
      lines[i] = lines[i].replace('routRes,', 'routRes, rosterRes,');
    }
  }
  
  // Fix 3: replace any lingering st?.full_name || st?.email with st?.name
  if (lines[i].includes('st?.full_name?.toLowerCase()') || lines[i].includes('st?.email?.toLowerCase()')) {
    lines[i] = lines[i].replace('st?.full_name?.toLowerCase().includes(search) || st?.email?.toLowerCase().includes(search)', 'st?.name?.toLowerCase().includes(search)');
  }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Fixed dashboard 2');
