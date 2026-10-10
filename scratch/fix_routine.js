const fs = require('fs');
const path = 'components/CoordinatorDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

const target = `  async function saveRoutineEntry() {
    if (!routClassId || !routOfferingId || !routTeacherId || !routStart || !routEnd) { showError?.("Please fill all required fields."); return; }
    setFormLoading(true);`;

const replacement = `  async function saveRoutineEntry() {
    if (!routClassId || !routOfferingId || !routTeacherId || !routStart || !routEnd) { showError?.("Please fill all required fields."); return; }
    if (routStart >= routEnd) {
      showError?.("End time must be after start time.");
      return;
    }
    const conflict = routines.find(r => 
      r.day_of_week === routDay &&
      ((r.start_time >= routStart && r.start_time < routEnd) ||
       (r.end_time > routStart && r.end_time <= routEnd) ||
       (r.start_time <= routStart && r.end_time >= routEnd)) &&
      (r.teacher_id === routTeacherId || r.class_id === routClassId || (routRoom && r.room === routRoom))
    );
    if (conflict) {
      showError?.("Schedule conflict detected for teacher, class, or room.");
      return;
    }
    setFormLoading(true);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(path, code, 'utf8');
  console.log('Success');
} else {
  // Use regex if line endings are an issue
  const regex = /async function saveRoutineEntry\(\) \{[\s\S]*?setFormLoading\(true\);/;
  if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code, 'utf8');
    console.log('Success via regex');
  } else {
    console.log('Target not found');
  }
}
