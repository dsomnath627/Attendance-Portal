const fs = require('fs');
const path = 'components/CoordinatorDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add saveRosterStudent
const saveClassRegex = /async function saveClass\(\) \{[\s\S]*?\} \/\/\s*(?:end saveClass)?/g; // Not using regex. I'll just find saveClass and insert after it.

const saveRosterFunc = `
  async function saveRosterStudent() {
    if (!rostStudentId || !rostName) { showError?.("Student ID and Name are required."); return; }
    if (rosterStudents.find(s => s.student_id === rostStudentId && s.id !== editingId)) {
      showError?.("Student ID already exists in the roster."); return;
    }
    setFormLoading(true);
    const data = { 
      student_id: rostStudentId, 
      name: rostName, 
      slr: rostSlr || null,
      department_id: rostDeptId || null,
      batch_id: rostBatchId || null,
      group_id: rostGroupId || null,
      attendance_code: rostAttCode || null
    };
    const { error } = editingId
      ? await supabase.from("students").update(data).eq("id", editingId)
      : await supabase.from("students").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Student updated." : "Student created."); resetForms(); loadAllData(); }
  }
`;

if (!code.includes('async function saveRosterStudent')) {
  code = code.replace(
    /async function saveSubject\(\)/,
    saveRosterFunc + '\n  async function saveSubject()'
  );
}

// Add Roster Tab UI
const enrollUiRegex = /\{\/\* STUDENT ENROLLMENTS TAB \*\/\}/;

const rosterUI = `          {/* STUDENT ROSTER TAB */}
          {subTab === "roster" && (() => {
            const filtered = rosterStudents.filter(s => {
              const search = searchQuery.toLowerCase();
              return s.name.toLowerCase().includes(search) || s.student_id.toLowerCase().includes(search) || s.attendance_code?.toLowerCase().includes(search);
            });
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Student" : "Add Student to Institutional Roster"}</h3>
              <div className="form-row">
                <div className="form-group"><label>Student ID *</label><input placeholder="e.g. 101100" value={rostStudentId} onChange={e => setRostStudentId(e.target.value)} /></div>
                <div className="form-group"><label>Full Name *</label><input placeholder="Student Name" value={rostName} onChange={e => setRostName(e.target.value)} /></div>
                <div className="form-group"><label>SLR / Registration</label><input placeholder="Optional" value={rostSlr} onChange={e => setRostSlr(e.target.value)} /></div>
                <div className="form-group"><label>Attendance Code</label><input placeholder="4-digit code" value={rostAttCode} onChange={e => setRostAttCode(e.target.value)} /></div>
                
                <div className="form-group"><label>Department</label><select value={rostDeptId} onChange={e => setRostDeptId(e.target.value)}><option value="">None</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="form-group"><label>Batch</label><select value={rostBatchId} onChange={e => setRostBatchId(e.target.value)}><option value="">None</option>{batches.filter(b => !rostDeptId || b.department_id === rostDeptId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div className="form-group"><label>Group</label><select value={rostGroupId} onChange={e => setRostGroupId(e.target.value)}><option value="">None</option>{groups.filter(g => !rostBatchId || g.batch_id === rostBatchId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
              </div>
              <button className="primary-btn" disabled={formLoading} onClick={saveRosterStudent}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update Student" : "Add Student"}</button>
              {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No students found in roster.</div> : (
                <div className="grid-list">
                  {filtered.map(st => {
                    const d = departments.find(d => d.id === st.department_id);
                    const b = batches.find(b => b.id === st.batch_id);
                    const g = groups.find(g => g.id === st.group_id);
                    return (
                      <div className="item-card" key={st.id}>
                        <div className="actions">
                          <button className="icon-btn" title="Edit" onClick={() => handleEdit("roster", st)}><Edit size={14} /></button>
                          <button className="icon-btn delete" onClick={() => deleteRecord("students", st.id)}><Trash2 size={14} /></button>
                        </div>
                        <div className="item-title">{st.name}</div>
                        <div className="item-sub">ID: {st.student_id} | Code: {st.attendance_code || "N/A"}</div>
                        <div className="item-sub">🏢 {d?.name || "N/A"} | 🎓 {b?.name || "N/A"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )})()}

`;

if (!code.includes('{/* STUDENT ROSTER TAB */}')) {
  code = code.replace(enrollUiRegex, rosterUI + '          {/* STUDENT ENROLLMENTS TAB */}');
}

fs.writeFileSync(path, code, 'utf8');
console.log('CoordinatorDashboard roster UI added.');
