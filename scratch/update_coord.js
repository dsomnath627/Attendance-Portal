const fs = require('fs');

const path = 'c:\\cpp0pw\\CODING\\Others\\Attendance-Portal_TIU\\components\\CoordinatorDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add "roster" to SubTab
code = code.replace(/type SubTab = (.*?);/, 'type SubTab = $1 | "roster";');

// 2. Add RosterStudent type
if (!code.includes('type RosterStudent')) {
  code = code.replace('type StudentGroup = ', 'type RosterStudent = { id: string; student_id: string; name: string; slr?: string; department_id?: string; batch_id?: string; group_id?: string; attendance_code?: string; is_active?: boolean; };\ntype StudentGroup = ');
}

// 3. Add states
if (!code.includes('const [rosterStudents, setRosterStudents]')) {
  code = code.replace('const [students, setStudents] = useState<UserProfile[]>([]);', 'const [students, setStudents] = useState<UserProfile[]>([]);\n  const [rosterStudents, setRosterStudents] = useState<RosterStudent[]>([]);');
  
  code = code.replace('const [enrollRoll, setEnrollRoll] = useState("");', 'const [enrollRoll, setEnrollRoll] = useState("");\n\n  const [rostStudentId, setRostStudentId] = useState("");\n  const [rostName, setRostName] = useState("");\n  const [rostSlr, setRostSlr] = useState("");\n  const [rostDeptId, setRostDeptId] = useState("");\n  const [rostBatchId, setRostBatchId] = useState("");\n  const [rostGroupId, setRostGroupId] = useState("");\n  const [rostAttCode, setRostAttCode] = useState("");\n  const [importing, setImporting] = useState(false);\n');
}

// 4. Update loadAllData
if (!code.includes('supabase.from("students").select("*")')) {
  code = code.replace('supabase.from("routines").select("*"),', 'supabase.from("routines").select("*"),\n        supabase.from("students").select("*").order("name"),');
  code = code.replace('const [\n        deptRes, progRes, yearRes, semRes, batchRes, groupRes,\n        classRes, subjRes, offeringRes, profileRes, enrollRes, routRes,\n      ]', 'const [\n        deptRes, progRes, yearRes, semRes, batchRes, groupRes,\n        classRes, subjRes, offeringRes, profileRes, enrollRes, routRes, rosterRes\n      ]');
  code = code.replace('if (routRes.data) setRoutines(routRes.data as RoutineEntry[]);', 'if (routRes.data) setRoutines(routRes.data as RoutineEntry[]);\n      if (rosterRes.data) setRosterStudents(rosterRes.data as RosterStudent[]);');
}

// 5. Update resetForms
if (!code.includes('setRostStudentId("");')) {
  code = code.replace('const resetForms = () => {', 'const resetForms = () => {\n    setRostStudentId(""); setRostName(""); setRostSlr(""); setRostDeptId(""); setRostBatchId(""); setRostGroupId(""); setRostAttCode("");');
}

// 6. Update handleEdit
if (!code.includes("else if (type === 'roster')")) {
  code = code.replace('else if (type === \'subjects\') {', 'else if (type === \'roster\') { setRostStudentId(item.student_id); setRostName(item.name); setRostSlr(item.slr || ""); setRostDeptId(item.department_id || ""); setRostBatchId(item.batch_id || ""); setRostGroupId(item.group_id || ""); setRostAttCode(item.attendance_code || ""); }\n    else if (type === \'subjects\') {');
}

// 7. Add saveRoster and handleImport
if (!code.includes('async function saveRoster()')) {
  const saveRosterFunc = `
  async function saveRoster() {
    if (!rostStudentId.trim() || !rostName.trim()) { showError?.("Student ID and Name are required."); return; }
    if (rosterStudents.find(r => r.student_id.toLowerCase() === rostStudentId.trim().toLowerCase() && r.id !== editingId)) {
      showError?.("Student ID already exists in the roster."); return;
    }
    setFormLoading(true);
    const data = {
      student_id: rostStudentId.trim(), name: rostName.trim(), slr: rostSlr.trim(),
      department_id: rostDeptId || null, batch_id: rostBatchId || null, group_id: rostGroupId || null,
      attendance_code: rostAttCode.trim() || null
    };
    const { error } = editingId
      ? await supabase.from("students").update(data).eq("id", editingId)
      : await supabase.from("students").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Student updated." : "Student created."); resetForms(); loadAllData(); }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of json) {
        if (!row.student_id || !row.name) { errorCount++; continue; }
        
        // Match department, batch by name if string provided
        let dId = null;
        let bId = null;
        let gId = null;
        
        if (row.department) {
           const d = departments.find(dep => dep.name.toLowerCase() === String(row.department).toLowerCase() || dep.code?.toLowerCase() === String(row.department).toLowerCase());
           if (d) dId = d.id;
        }
        if (row.batch) {
           const b = batches.find(bat => bat.name.toLowerCase() === String(row.batch).toLowerCase());
           if (b) bId = b.id;
        }
        if (row.group) {
           const g = groups.find(grp => grp.name.toLowerCase() === String(row.group).toLowerCase());
           if (g) gId = g.id;
        }
        
        const existing = rosterStudents.find(r => r.student_id.toLowerCase() === String(row.student_id).toLowerCase());
        const rowData = {
          student_id: String(row.student_id), name: String(row.name), slr: row.slr ? String(row.slr) : null,
          department_id: dId, batch_id: bId, group_id: gId, attendance_code: row.attendance_code ? String(row.attendance_code) : null
        };
        
        const { error } = existing 
          ? await supabase.from("students").update(rowData).eq("id", existing.id)
          : await supabase.from("students").insert([rowData]);
          
        if (error) errorCount++; else successCount++;
      }
      
      notify?.(\`Import complete: \${successCount} succeeded, \${errorCount} failed or skipped.\`);
      loadAllData();
    } catch (err: any) {
      showError?.("Import failed: " + err.message);
    }
    setImporting(false);
    e.target.value = ''; // reset file input
  };
  
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      student_id: "TIU12345", name: "John Doe", slr: "R12", department: "CSE", batch: "2024-2028", group: "Group A", attendance_code: "JD123"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
  };
`;
  code = code.replace('// --- RENDER HELPERS ---', saveRosterFunc + '\n  // --- RENDER HELPERS ---');
}

fs.writeFileSync(path, code, 'utf8');
console.log('Script updated with baseline roster state and functions.');
