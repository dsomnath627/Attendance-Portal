const fs = require('fs');
const path = 'components/CoordinatorDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Update saveSubjectOffering
const saveSORegex = /async function saveSubjectOffering\(\) \{([\s\S]*?)\} \/\/ end saveSubjectOffering/g; // Wait, I didn't add comments.
const saveSORegex2 = /async function saveSubjectOffering\(\) \{[\s\S]*?setFormLoading\(false\);\s*if \(error\) showError\?\([^;]+;\s*else \{ notify\?\([^;]+;\s*resetForms\(\);\s*loadAllData\(\);\s*\}\s*\}/;

const saveSOReplace = `async function saveSubjectOffering() {
    if (!assignSubjId || !assignClassId || !assignTeacherId || !assignSemId || !assignYearId) { showError?.("All fields are required."); return; }
    if (subjectOfferings.find(so => so.subject_id === assignSubjId && so.class_id === assignClassId && so.semester_id === assignSemId && so.academic_year_id === assignYearId && so.id !== editingId)) {
      showError?.("This subject is already offered to this class for the selected semester and year."); return;
    }
    setFormLoading(true);
    const data = { subject_id: assignSubjId, class_id: assignClassId, teacher_id: assignTeacherId, semester_id: assignSemId, academic_year_id: assignYearId };
    const { error } = editingId 
      ? await supabase.from("subject_offerings").update(data).eq("id", editingId)
      : await supabase.from("subject_offerings").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Subject offering updated." : "Subject offering created."); resetForms(); loadAllData(); }
  }`;

if (code.match(saveSORegex2)) {
  code = code.replace(saveSORegex2, saveSOReplace);
}

// 2. Update saveRoutineEntry
const saveRoutRegex = /async function saveRoutineEntry\(\) \{[\s\S]*?const \{ error \} = await supabase\.from\("routines"\)\.insert\(\[\{[\s\S]*?\}\]\);\s*setFormLoading\(false\);\s*if \(error\).*?else \{.*?\}/;
const saveRoutReplace = `async function saveRoutineEntry() {
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
      (r.teacher_id === routTeacherId || r.class_id === routClassId || (routRoom && r.room === routRoom)) &&
      r.id !== editingId
    );
    if (conflict) {
      showError?.("Schedule conflict detected for teacher, class, or room.");
      return;
    }
    setFormLoading(true);
    const data = {
      class_id: routClassId, subject_offering_id: routOfferingId, teacher_id: routTeacherId,
      day_of_week: routDay, start_time: routStart, end_time: routEnd, room: routRoom
    };
    const { error } = editingId
      ? await supabase.from("routines").update(data).eq("id", editingId)
      : await supabase.from("routines").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Routine updated." : "Routine created."); resetForms(); loadAllData(); }
  }`;

if (code.match(saveRoutRegex)) {
  code = code.replace(saveRoutRegex, saveRoutReplace);
}

// 3. Update handleEdit
const handleEditRegex = /const handleEdit = \(type: string, item: any\) => \{[\s\S]*?else if \(type === 'subjects'\) \{[^\}]+\}\s*\};/;
const handleEditReplace = `const handleEdit = (type: string, item: any) => {
    setEditingId(item.id);
    if (type === 'departments') { setDeptName(item.name); setDeptCode(item.code || ""); }
    else if (type === 'programs') { setProgName(item.name); setProgDeptId(item.department_id); setProgLevel(item.level || ""); }
    else if (type === 'academic_years') { setYearName(item.name); }
    else if (type === 'semesters') { setSemName(item.name); }
    else if (type === 'batches') { setBatchName(item.name); setBatchDeptId(item.department_id); }
    else if (type === 'groups') { setGroupName(item.name); setGroupBatchId(item.batch_id); }
    else if (type === 'classes') { setClassName(item.name); setClassBatchId(item.batch_id); }
    else if (type === 'roster') { setRostStudentId(item.student_id); setRostName(item.name); setRostSlr(item.slr || ""); setRostDeptId(item.department_id || ""); setRostBatchId(item.batch_id || ""); setRostGroupId(item.group_id || ""); setRostAttCode(item.attendance_code || ""); }
    else if (type === 'subjects') { setSubjName(item.name); setSubjCode(item.code || ""); setSubjDeptId(item.department_id); setSubjSemId(item.semester_id || ""); setSubjCredits(item.credits?.toString() || "4"); }
    else if (type === 'subject_offerings') { setAssignSubjId(item.subject_id); setAssignClassId(item.class_id); setAssignTeacherId(item.teacher_id); setAssignSemId(item.semester_id); setAssignYearId(item.academic_year_id); }
    else if (type === 'routines') { setRoutClassId(item.class_id); setRoutOfferingId(item.subject_offering_id); setRoutTeacherId(item.teacher_id); setRoutDay(item.day_of_week); setRoutStart(item.start_time); setRoutEnd(item.end_time); setRoutRoom(item.room || ""); }
  };`;

if (code.match(handleEditRegex)) {
  code = code.replace(handleEditRegex, handleEditReplace);
}

// 4. Update Subject Offering UI to show Edit button
const soUIRegex = /<div className="actions">\s*<button className="icon-btn" title=\{so\.is_active === false \? "Activate" : "Deactivate"\}[^>]*>.*?<\/button>\s*<button className="icon-btn delete" onClick=\{.*?deleteRecord\("subject_offerings", so\.id\)\}[^>]*>.*?<\/button>\s*<\/div>/;
const soUIReplace = `<div className="actions">
                          <button className="icon-btn" title="Edit" onClick={() => handleEdit("subject_offerings", so)}><Edit size={14} /></button>
                          <button className="icon-btn" title={so.is_active === false ? "Activate" : "Deactivate"} onClick={() => toggleStatus("subject_offerings", so.id, so.is_active !== false)}>{so.is_active === false ? <Power size={14} /> : <PowerOff size={14} />}</button>
                          <button className="icon-btn delete" onClick={() => deleteRecord("subject_offerings", so.id)}><Trash2 size={14} /></button>
                        </div>`;
if (code.match(soUIRegex)) {
  code = code.replace(soUIRegex, soUIReplace);
}

// 5. Update Routines UI to show Edit button
const routUIRegex = /<div className="actions"><button className="icon-btn delete" onClick=\{\(\) => deleteRecord\("routines", r\.id\)\}><Trash2 size=\{14\} \/><\/button><\/div>/;
const routUIReplace = `<div className="actions">
                          <button className="icon-btn" title="Edit" onClick={() => handleEdit("routines", r)}><Edit size={14} /></button>
                          <button className="icon-btn delete" onClick={() => deleteRecord("routines", r.id)}><Trash2 size={14} /></button>
                        </div>`;
if (code.match(routUIRegex)) {
  code = code.replace(routUIRegex, routUIReplace);
}

// Update Subject Offering Create button text
const soBtnRegex = /<button className="primary-btn" disabled=\{formLoading\} onClick=\{saveSubjectOffering\}><Plus size=\{16\} \/> Assign Teacher<\/button>/;
const soBtnReplace = `<button className="primary-btn" disabled={formLoading} onClick={saveSubjectOffering}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update Assignment" : "Assign Teacher"}</button>
              {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}`;
if (code.match(soBtnRegex)) {
  code = code.replace(soBtnRegex, soBtnReplace);
}

// Update Routines Create button text
const routBtnRegex = /<button className="primary-btn" disabled=\{formLoading\} onClick=\{saveRoutineEntry\}><Plus size=\{16\} \/> Add Routine<\/button>/;
const routBtnReplace = `<button className="primary-btn" disabled={formLoading} onClick={saveRoutineEntry}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update Routine" : "Add Routine"}</button>
              {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}`;
if (code.match(routBtnRegex)) {
  code = code.replace(routBtnRegex, routBtnReplace);
}

fs.writeFileSync(path, code, 'utf8');
console.log('CoordinatorDashboard patched successfully.');
