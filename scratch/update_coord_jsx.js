const fs = require('fs');

const path = 'c:\\cpp0pw\\CODING\\Others\\Attendance-Portal_TIU\\components\\CoordinatorDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Update subnav buttons
code = code.replace(
  '<button className={`subnav-btn ${subTab === "students" ? "active" : ""}`} onClick={() => handleTabChange("students")}>🎒 Enrollments ({enrollments.length})</button>',
  '<button className={`subnav-btn ${subTab === "roster" ? "active" : ""}`} onClick={() => handleTabChange("roster")}>🧑‍🎓 Student Roster ({rosterStudents.length})</button>\n        <button className={`subnav-btn ${subTab === "students" ? "active" : ""}`} onClick={() => handleTabChange("students")}>🎒 Class Enrollments ({enrollments.length})</button>'
);

// 2. Add roster tab rendering JSX
const rosterJsx = `
        {subTab === "roster" && (
          <div className="coord-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={20} color="#3b82f6" /> {editingId ? "Edit Student" : "Add Student to Roster"}
              </h2>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="secondary-btn" onClick={downloadTemplate}><Download size={16} /> Template</button>
                <label className="secondary-btn" style={{ cursor: "pointer", margin: 0 }}>
                  {importing ? "Importing..." : <><Upload size={16} /> Import Excel</>}
                  <input type="file" accept=".xlsx, .xls, .csv" style={{ display: "none" }} onChange={handleFileUpload} disabled={importing} />
                </label>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Student ID *</label>
                <input type="text" placeholder="e.g. TIU101" value={rostStudentId} onChange={(e) => setRostStudentId(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input type="text" placeholder="e.g. John Doe" value={rostName} onChange={(e) => setRostName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Roll / SLR</label>
                <input type="text" placeholder="e.g. 15" value={rostSlr} onChange={(e) => setRostSlr(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <select value={rostDeptId} onChange={(e) => setRostDeptId(e.target.value)}>
                  <option value="">-- None --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Batch</label>
                <select value={rostBatchId} onChange={(e) => setRostBatchId(e.target.value)}>
                  <option value="">-- None --</option>
                  {batches.filter(b => !rostDeptId || b.department_id === rostDeptId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Group</label>
                <select value={rostGroupId} onChange={(e) => setRostGroupId(e.target.value)}>
                  <option value="">-- None --</option>
                  {groups.filter(g => !rostBatchId || g.batch_id === rostBatchId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              <button className="primary-btn" onClick={saveRoster} disabled={formLoading}>
                <Save size={16} /> {formLoading ? "Saving..." : editingId ? "Update Student" : "Add Student"}
              </button>
            </div>

            <h3 style={{ marginTop: "40px", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb" }}>Institutional Roster</h3>
            {renderFilter()}
            
            {rosterStudents.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.student_id.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="empty-state">No students found in the roster.</div>
            ) : (
              <div className="grid-list">
                {rosterStudents.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.student_id.toLowerCase().includes(searchQuery.toLowerCase())).map(r => {
                  const dept = departments.find(d => d.id === r.department_id);
                  const batch = batches.find(b => b.id === r.batch_id);
                  return (
                    <div key={r.id} className={\`item-card \${r.is_active ? "" : "inactive"}\`}>
                      <div className="actions">
                        <button className="icon-btn" onClick={() => handleEdit('roster', r)}><Edit size={14}/></button>
                        <button className="icon-btn" onClick={() => toggleStatus('students', r.id, r.is_active ?? true)}>
                           {r.is_active ? <Power size={14} /> : <PowerOff size={14} color="#ef4444" />}
                        </button>
                      </div>
                      <div className="item-title">{r.name}</div>
                      <div className="item-sub"><strong>ID:</strong> {r.student_id} {r.slr && \`| Roll: \${r.slr}\`}</div>
                      <div className="item-sub"><strong>Dept:</strong> {dept?.name || "N/A"}</div>
                      <div className="item-sub"><strong>Batch:</strong> {batch?.name || "N/A"}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
`;

code = code.replace('{subTab === "overview" && (', rosterJsx + '\n        {subTab === "overview" && (');

fs.writeFileSync(path, code, 'utf8');
console.log('Script updated with JSX for Roster Tab.');
