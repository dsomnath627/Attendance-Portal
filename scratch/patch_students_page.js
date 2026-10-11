const fs = require('fs');
const path = 'components/App.tsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Update lucide-react imports to include CheckCircle, AlertCircle, Search, X
if (!code.includes('CheckCircle,') && code.includes('import {') && code.includes('from "lucide-react";')) {
  code = code.replace(
    '  Shield,\n} from "lucide-react";',
    '  Shield,\n  CheckCircle,\n  AlertCircle,\n  Search,\n  X,\n} from "lucide-react";'
  );
  if (!code.includes('CheckCircle,')) {
    code = code.replace(
      '  Shield,\r\n} from "lucide-react";',
      '  Shield,\r\n  CheckCircle,\r\n  AlertCircle,\r\n  Search,\r\n  X,\r\n} from "lucide-react";'
    );
  }
}

// 2. Update type ImportStudent
const importTypeRegex = /type ImportStudent = \{[\s\S]*?\};/;
const newImportType = `type ImportStudent = {
  user_id?: string;
  student_id: string;
  name: string;
  slr: string | null;
  department_id?: string;
  batch_id?: string;
  group_id?: string | null;
  group_name?: string;
  attendance_code?: string;
};`;

if (importTypeRegex.test(code)) {
  code = code.replace(importTypeRegex, newImportType);
  console.log("Updated type ImportStudent");
} else {
  console.log("Warning: could not find type ImportStudent regex");
}

// 3. Replace StudentsPage component
const studentsPageRegex = /\/\* ============================================================\s+STUDENT MANAGEMENT\s+============================================================ \*\/[\s\S]*?function StudentsPage\(\{[\s\S]*?\}\s*\n\s*\/\* ============================================================\s+ATTENDANCE PAGE/;

const newStudentsPage = `/* ============================================================
   STUDENT MANAGEMENT
============================================================ */

function StudentsPage({
  user,
  departments,
  batches,
  groups,
  students,
  onReload,
  notify,
  showError,
}: {
  user: User;
  departments: Department[];
  batches: Batch[];
  groups: StudentGroup[];
  students: Student[];
  onReload: () => Promise<void>;
  notify: (text: string) => void;
  showError: (text: string) => void;
}) {
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [group, setGroup] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [slr, setSlr] = useState("");
  const [search, setSearch] = useState("");

  /* ----------------------------------------------------------
     EXCEL IMPORT STATE & MODAL CONTROLS
  ---------------------------------------------------------- */
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importRows, setImportRows] = useState<ImportStudent[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Modal target selections (allows changing Department / Batch / Group right inside the modal)
  const [modalDept, setModalDept] = useState("");
  const [modalBatch, setModalBatch] = useState("");
  const [modalGroup, setModalGroup] = useState("");
  const [modalSearch, setModalSearch] = useState("");

  const filteredBatches = batches.filter(
    (b) => b.department_id === department && b.is_active
  );

  const filteredGroups = groups.filter(
    (g) => g.batch_id === batch && g.is_active
  );

  // Batches & Groups for inside the Import Modal
  const modalBatches = batches.filter(
    (b) => b.department_id === (modalDept || department) && b.is_active
  );

  const modalGroups = groups.filter(
    (g) => g.batch_id === (modalBatch || batch) && g.is_active
  );

  const filteredStudents = students.filter((student) => {
    if (!student.is_active) return false;
    if (department && student.department_id !== department) return false;
    if (batch && student.batch_id !== batch) return false;
    if (group && student.group_id !== group) return false;

    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      student.student_id.toLowerCase().includes(query) ||
      student.name.toLowerCase().includes(query) ||
      (student.slr || "").toLowerCase().includes(query) ||
      (student.attendance_code || "").toLowerCase().includes(query)
    );
  });

  /* ----------------------------------------------------------
     ADD SINGLE STUDENT
  ---------------------------------------------------------- */
  async function addStudent() {
    if (!studentId.trim() || !name.trim() || !department || !batch) {
      showError("Student ID, Name, Department, and Batch are required.");
      return;
    }

    const cleanStudentId = studentId.trim();
    const attCode = getLastFourDigits(cleanStudentId);

    // Resolve group: use selected group, or first active group in batch, or null
    let activeGroupId = group || null;
    if (!activeGroupId) {
      const existing = groups.find((g) => g.batch_id === batch && g.is_active);
      if (existing) {
        activeGroupId = existing.id;
      }
    }

    const { error } = await supabase.from("students").insert({
      user_id: user.id,
      student_id: cleanStudentId,
      name: name.trim(),
      slr: slr.trim() || null,
      department_id: department,
      batch_id: batch,
      group_id: activeGroupId,
      attendance_code: attCode,
      is_active: true,
    });

    if (error) {
      console.error("Add student error:", error);
      if (error.message?.includes("violates row-level security") || error.code === "42501") {
        showError("Permission error: Database blocked inserting student. Please execute the migration in Supabase SQL editor.");
      } else {
        showError(error.message);
      }
      return;
    }

    setStudentId("");
    setName("");
    setSlr("");
    notify("Student added successfully.");
    await onReload();
  }

  /* ----------------------------------------------------------
     EXCEL FILE SELECT & ROBUST PARSER
  ---------------------------------------------------------- */
  async function handleExcelSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

      if (!workbook.SheetNames.length) {
        showError("Excel file has no sheets.");
        e.target.value = "";
        return;
      }

      let parsedRecords: ImportStudent[] = [];

      const idKeywords = [
        "studentid", "studentno", "studentnumber", "studentcode",
        "registrationno", "registrationnumber", "registrationid",
        "regno", "regid", "enrollmentno", "enrollmentnumber", "enrollno",
        "roll", "rollno", "rollnumber", "id", "slr"
      ];
      const nameKeywords = [
        "name", "studentname", "studentfullname", "fullname", "student"
      ];
      const slrKeywords = [
        "slr", "slrno", "slrnumber", "slrroll", "classroll", "classrollno"
      ];
      const groupKeywords = [
        "group", "section", "studentgroup", "groupname", "batchgroup", "sec"
      ];

      // Scan sheets until we find one with Student ID and Name columns
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
        if (!rawRows || rawRows.length === 0) continue;

        let headerRowIndex = -1;
        let idColIndex = -1;
        let nameColIndex = -1;
        let slrColIndex = -1;
        let groupColIndex = -1;

        // Check first 15 rows for header names
        for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;

          let foundId = -1;
          let foundName = -1;
          let foundSlr = -1;
          let foundGroup = -1;

          row.forEach((cellVal, colIdx) => {
            const norm = String(cellVal || "")
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]/g, "");
            if (!norm) return;

            if (foundId === -1 && idKeywords.includes(norm)) foundId = colIdx;
            else if (foundName === -1 && nameKeywords.includes(norm)) foundName = colIdx;
            else if (foundSlr === -1 && slrKeywords.includes(norm)) foundSlr = colIdx;
            else if (foundGroup === -1 && groupKeywords.includes(norm)) foundGroup = colIdx;
          });

          if (foundId !== -1 && foundName !== -1) {
            headerRowIndex = r;
            idColIndex = foundId;
            nameColIndex = foundName;
            slrColIndex = foundSlr;
            groupColIndex = foundGroup;
            break;
          }
        }

        if (headerRowIndex !== -1) {
          for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!Array.isArray(row)) continue;

            const stId = String(row[idColIndex] ?? "").trim();
            const stName = String(row[nameColIndex] ?? "").trim();
            const stSlr = slrColIndex !== -1 ? String(row[slrColIndex] ?? "").trim() : "";
            const stGroup = groupColIndex !== -1 ? String(row[groupColIndex] ?? "").trim() : "";

            if (!stId && !stName) continue;
            if (!stId || !stName) continue;

            parsedRecords.push({
              student_id: stId,
              name: stName,
              slr: stSlr || null,
              group_name: stGroup || undefined,
              attendance_code: getLastFourDigits(stId),
            });
          }
          break; // Found suitable sheet
        }
      }

      if (!parsedRecords.length) {
        showError(
          "No suitable student sheet found. Excel must contain columns for Student ID and Name."
        );
        e.target.value = "";
        return;
      }

      // Remove duplicate student IDs within the same file
      const uniqueRecords = Array.from(
        new Map(parsedRecords.map((item) => [item.student_id, item])).values()
      );

      // Pre-set target Department & Batch for the modal
      setModalDept(department || (departments.length > 0 ? departments[0].id : ""));
      setModalBatch(batch || "");
      setModalGroup(group || "");
      setModalSearch("");

      setImportRows(uniqueRecords);
      setImportFileName(file.name);
      setShowImportPreview(true);
      e.target.value = "";
    } catch (err) {
      console.error("Excel reading error:", err);
      showError(err instanceof Error ? err.message : "Could not read Excel file.");
      e.target.value = "";
    }
  }

  /* ----------------------------------------------------------
     CONFIRM EXCEL IMPORT (NO PREMATURE CRASHES, CHUNKED UPSERT)
  ---------------------------------------------------------- */
  async function confirmExcelImport() {
    const targetDept = modalDept || department;
    const targetBatch = modalBatch || batch;

    if (!targetDept) {
      showError("Please select a Department in the import modal.");
      return;
    }
    if (!targetBatch) {
      showError("Please select a Batch in the import modal.");
      return;
    }
    if (!importRows.length) {
      showError("There are no students to import.");
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: importRows.length });

    try {
      // 1. Resolve student groups without crashing
      const groupMap = new Map<string, string>();
      groups
        .filter((g) => g.batch_id === targetBatch && g.is_active)
        .forEach((g) => groupMap.set(g.name.trim().toLowerCase(), g.id));

      // Find any group names from Excel that do not exist yet in DB
      const missingGroupNames = Array.from(
        new Set(
          importRows
            .map((r) => r.group_name?.trim())
            .filter((name): name is string => Boolean(name && !groupMap.has(name.toLowerCase())))
        )
      );

      if (missingGroupNames.length > 0) {
        const newGroupsPayload = missingGroupNames.map((gName) => ({
          user_id: user.id,
          batch_id: targetBatch,
          name: gName,
          is_active: true,
        }));

        const { data: createdGroups, error: grpInsertErr } = await supabase
          .from("student_groups")
          .insert(newGroupsPayload)
          .select("id, name");

        if (!grpInsertErr && createdGroups) {
          createdGroups.forEach((cg) => {
            groupMap.set(cg.name.trim().toLowerCase(), cg.id);
          });
        }
      }

      const fallbackGroupId = modalGroup || group || null;

      // 2. Chunked upsert
      const chunkSize = 50;
      let importedCount = 0;

      for (let i = 0; i < importRows.length; i += chunkSize) {
        const chunk = importRows.slice(i, i + chunkSize);
        const payload = chunk.map((r) => {
          let assignedGroupId = fallbackGroupId;
          if (r.group_name && groupMap.has(r.group_name.trim().toLowerCase())) {
            assignedGroupId = groupMap.get(r.group_name.trim().toLowerCase())!;
          }

          return {
            user_id: user.id,
            student_id: r.student_id.trim(),
            name: r.name.trim(),
            slr: r.slr?.trim() || null,
            department_id: targetDept,
            batch_id: targetBatch,
            group_id: assignedGroupId || null,
            attendance_code: getLastFourDigits(r.student_id.trim()),
            is_active: true,
          };
        });

        const { error } = await supabase.from("students").upsert(payload, {
          onConflict: "student_id",
        });

        if (error) {
          console.error("Supabase import error:", error);
          if (error.message?.includes("violates row-level security") || error.code === "42501") {
            showError("Permission denied: Database policy blocked student insertion. Please execute the migration script in Supabase SQL Editor.");
          } else {
            showError(\`Import failed: \${error.message}\`);
          }
          setImporting(false);
          setImportProgress(null);
          return;
        }

        importedCount += chunk.length;
        setImportProgress({ current: importedCount, total: importRows.length });
      }

      const targetBatchName = batches.find((b) => b.id === targetBatch)?.name || "Batch";
      notify(\`\${importedCount} student(s) imported successfully into \${targetBatchName}!\`);
      setImportRows([]);
      setImportFileName("");
      setShowImportPreview(false);
      await onReload();
    } catch (err) {
      console.error("Import error:", err);
      showError(err instanceof Error ? err.message : "Student import failed.");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  /* ----------------------------------------------------------
     DOWNLOAD EXCEL TEMPLATE
  ---------------------------------------------------------- */
  function downloadStudentTemplate() {
    const templateRows = [
      {
        "Student ID": "2024010001",
        Name: "Arun Ghosh",
        SLR: "1",
        Group: "BCS 3D",
      },
      {
        "Student ID": "2024010002",
        Name: "Sneha Mukherjee",
        SLR: "2",
        Group: "BCS 3D",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "student_import_template.xlsx");
    notify("Student Excel template downloaded.");
  }

  /* ----------------------------------------------------------
     DEACTIVATE STUDENT
  ---------------------------------------------------------- */
  async function deactivateStudent(id: string) {
    const confirmed = window.confirm("Deactivate this student?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("students")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      showError(error.message);
      return;
    }

    notify("Student deactivated.");
    await onReload();
  }

  async function deleteFilteredStudents() {
    if (filteredStudents.length === 0) return;

    const confirmed = window.confirm(
      \`Are you sure you want to permanently delete \${filteredStudents.length} student(s) currently shown in the list? This action cannot be undone.\`
    );
    if (!confirmed) return;

    setImporting(true);
    const studentIds = filteredStudents.map((s) => s.id);
    const chunkSize = 100;
    let deletedCount = 0;

    try {
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("students")
          .delete()
          .in("id", chunk);

        if (error) throw error;
        deletedCount += chunk.length;
      }
      notify(\`Successfully deleted \${deletedCount} student(s).\`);
      await onReload();
    } catch (error: any) {
      showError(error.message || "Failed to delete students.");
    } finally {
      setImporting(false);
    }
  }

  const modalPreviewList = importRows.filter((r) => {
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase().trim();
    return (
      r.student_id.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      (r.slr || "").toLowerCase().includes(q) ||
      (r.group_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="page">
      {/* ====================================================
          ADD STUDENT PANEL
      ===================================================== */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Add Student</h2>
            <p>
              Attendance code is automatically generated from the last 4 digits of Student ID.
            </p>
          </div>
          <Users />
        </div>

        <div className="form-grid">
          <div>
            <label>Department *</label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setBatch("");
                setGroup("");
              }}
            >
              <option value="">Select Department</option>
              {departments
                .filter((d) => d.is_active)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label>Batch *</label>
            <select
              value={batch}
              onChange={(e) => {
                setBatch(e.target.value);
                setGroup("");
              }}
            >
              <option value="">Select Batch</option>
              {filteredBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Group / Section</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="">Select Group (Optional)</option>
              {filteredGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Student ID *</label>
            <input
              placeholder="e.g. 2023012345"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>

          <div>
            <label>Name *</label>
            <input
              placeholder="Student name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label>SLR / Roll</label>
            <input
              placeholder="Optional"
              value={slr}
              onChange={(e) => setSlr(e.target.value)}
            />
          </div>
        </div>

        <div className="button-row">
          <button className="primary-btn" onClick={addStudent}>
            <Plus size={17} />
            Add Student
          </button>
        </div>
      </div>

      {/* ====================================================
          STUDENT RECORDS PANEL
      ===================================================== */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Student Records</h2>
            <p>{filteredStudents.length} active student(s)</p>
          </div>

          <div className="button-row">
            <button className="secondary-btn" onClick={downloadStudentTemplate}>
              <Download size={17} />
              Template
            </button>

            <label className="upload-small" style={{ cursor: "pointer" }}>
              <Upload size={17} />
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={handleExcelSelect}
              />
            </label>

            {filteredStudents.length > 0 && (
              <button
                className="delete-btn"
                onClick={deleteFilteredStudents}
                disabled={importing}
                style={{
                  marginLeft: "8px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                }}
              >
                <Trash2 size={15} />
                Delete Filtered
              </button>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="form-grid">
          <div>
            <label>Department Filter</label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setBatch("");
                setGroup("");
              }}
            >
              <option value="">All Departments</option>
              {departments
                .filter((d) => d.is_active)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label>Batch Filter</label>
            <select
              value={batch}
              onChange={(e) => {
                setBatch(e.target.value);
                setGroup("");
              }}
            >
              <option value="">All Batches</option>
              {filteredBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Group Filter</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="">All Groups</option>
              {filteredGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <input
          className="search-input"
          placeholder="Search Student ID, Name or SLR..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>SLR</th>
                <th>Department</th>
                <th>Batch</th>
                <th>Group</th>
                <th>OCR Code</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => {
                const deptObj = departments.find((d) => d.id === student.department_id);
                const batchObj = batches.find((b) => b.id === student.batch_id);
                const groupObj = groups.find((g) => g.id === student.group_id);

                return (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.student_id}</strong>
                    </td>
                    <td>{student.name}</td>
                    <td>{student.slr || "-"}</td>
                    <td>{deptObj?.name || "-"}</td>
                    <td>{batchObj?.name || "-"}</td>
                    <td>{groupObj?.name || "-"}</td>
                    <td>
                      <span className="code-pill">
                        {student.attendance_code || getLastFourDigits(student.student_id)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-danger"
                        title="Deactivate"
                        onClick={() => deactivateStudent(student.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filteredStudents.length && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px" }}>
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================
          FLEXIBLE & BEAUTIFUL EXCEL IMPORT PREVIEW MODAL
      ===================================================== */}
      {showImportPreview && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "1000px" }}>
            <div className="modal-header">
              <div>
                <h2>Excel Import Preview</h2>
                <p>
                  Review student list from <strong>{importFileName}</strong> and assign target Department & Batch before importing.
                </p>
              </div>

              <button
                className="icon-danger"
                onClick={() => {
                  setShowImportPreview(false);
                  setImportRows([]);
                  setImportProgress(null);
                }}
                disabled={importing}
                style={{ cursor: "pointer", background: "none", border: "none", fontSize: "1.2rem", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>

            {/* TARGET SELECTION INSIDE MODAL */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#166534", marginBottom: "4px" }}>
                  Destination Department *
                </label>
                <select
                  value={modalDept}
                  onChange={(e) => {
                    setModalDept(e.target.value);
                    setModalBatch("");
                    setModalGroup("");
                  }}
                  disabled={importing}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #86efac", background: "white" }}
                >
                  <option value="">Select Department</option>
                  {departments
                    .filter((d) => d.is_active)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#166534", marginBottom: "4px" }}>
                  Destination Batch *
                </label>
                <select
                  value={modalBatch}
                  onChange={(e) => {
                    setModalBatch(e.target.value);
                    setModalGroup("");
                  }}
                  disabled={importing}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #86efac", background: "white" }}
                >
                  <option value="">Select Batch</option>
                  {modalBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#166534", marginBottom: "4px" }}>
                  Default Group (Optional)
                </label>
                <select
                  value={modalGroup}
                  onChange={(e) => setModalGroup(e.target.value)}
                  disabled={importing}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #86efac", background: "white" }}
                >
                  <option value="">Auto-detect from file / None</option>
                  {modalGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SUMMARY STATS & IN-MODAL SEARCH */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                  📋 {importRows.length} Unique Records
                </span>
                {importRows.some((r) => r.group_name) && (
                  <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                    👥 Sections detected in file
                  </span>
                )}
              </div>

              <div style={{ width: "260px" }}>
                <input
                  type="text"
                  placeholder="Filter preview rows..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  style={{ width: "100%", padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </div>

            {/* PROGRESS BAR IF IMPORTING */}
            {importing && importProgress && (
              <div style={{ marginBottom: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span>Importing students...</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <div style={{ background: "#e2e8f0", borderRadius: "8px", height: "8px", overflow: "hidden" }}>
                  <div
                    style={{
                      background: "#2563eb",
                      height: "100%",
                      width: \`\${(importProgress.current / importProgress.total) * 100}%\`,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* PREVIEW TABLE */}
            <div className="table-wrap" style={{ maxHeight: "380px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>SLR</th>
                    <th>Section / Group</th>
                    <th>OCR Code</th>
                  </tr>
                </thead>

                <tbody>
                  {modalPreviewList.slice(0, 100).map((student, index) => (
                    <tr key={\`\${student.student_id}-\${index}\`}>
                      <td>{index + 1}</td>
                      <td><strong>{student.student_id}</strong></td>
                      <td>{student.name}</td>
                      <td>{student.slr || "-"}</td>
                      <td>{student.group_name || (modalGroup ? modalGroups.find((g) => g.id === modalGroup)?.name : "-")}</td>
                      <td>
                        <span className="code-pill">
                          {getLastFourDigits(student.student_id)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {modalPreviewList.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                        No records match the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {importRows.length > 100 && (
              <p className="preview-note" style={{ marginTop: "8px" }}>
                Showing first 100 preview records. Total records in file: {importRows.length}.
              </p>
            )}

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button
                className="secondary-btn"
                onClick={() => {
                  setShowImportPreview(false);
                  setImportRows([]);
                }}
                disabled={importing}
              >
                Cancel
              </button>

              <button
                className="primary-btn"
                onClick={confirmExcelImport}
                disabled={importing || !modalBatch || !modalDept}
              >
                {importing ? (
                  <>
                    <RefreshCw size={17} className="spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={17} />
                    Confirm & Import {importRows.length} Students
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ATTENDANCE PAGE`;

if (studentsPageRegex.test(code)) {
  code = code.replace(studentsPageRegex, newStudentsPage);
  console.log("Successfully matched and replaced StudentsPage!");
} else {
  console.error("Error: Could not match StudentsPage regex in App.tsx!");
  process.exit(1);
}

fs.writeFileSync(path, code, 'utf8');
console.log("Done patching App.tsx!");
