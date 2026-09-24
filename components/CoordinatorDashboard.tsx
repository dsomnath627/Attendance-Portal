"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import * as XLSX from "xlsx";
import {
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  Users,
  BookOpen,
  UserCheck,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Upload,
  RefreshCw,
  Search,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";

type Department = { id: string; name: string; code?: string | null };
type Program = { id: string; department_id: string; name: string; level?: string; duration_years?: number };
type AcademicYear = { id: string; name: string; is_current?: boolean };
type Semester = { id: string; name: string };
type Batch = { id: string; department_id: string; name: string };
type ClassItem = { id: string; batch_id: string; name: string };
type Subject = { id: string; department_id: string; name: string; code?: string; credits?: number; semester_id?: string };
type SubjectOffering = {
  id: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  semester_id: string;
  academic_year_id: string;
};
type ClassEnrollment = {
  id: string;
  student_id: string;
  class_id: string;
  roll_number?: string;
};
type RoutineEntry = {
  id: string;
  class_id: string;
  subject_offering_id: string;
  teacher_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room?: string;
};

type SubTab =
  | "overview"
  | "departments"
  | "programs"
  | "academic_years"
  | "semesters"
  | "batches"
  | "classes"
  | "subjects"
  | "assignments"
  | "students"
  | "routines";

export default function CoordinatorDashboard({
  userProfile,
  onReload,
  notify,
  showError,
}: {
  userProfile: UserProfile;
  onReload?: () => void;
  notify?: (msg: string) => void;
  showError?: (msg: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [loading, setLoading] = useState(true);

  // Entities state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectOfferings, setSubjectOfferings] = useState<SubjectOffering[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [routines, setRoutines] = useState<RoutineEntry[]>([]);

  // Form states
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

  const [progDeptId, setProgDeptId] = useState("");
  const [progName, setProgName] = useState("");
  const [progLevel, setProgLevel] = useState("B.Tech");

  const [yearName, setYearName] = useState("2026-2027");

  const [semName, setSemName] = useState("Semester 5");

  const [batchDeptId, setBatchDeptId] = useState("");
  const [batchName, setBatchName] = useState("2024-2028");

  const [classBatchId, setClassBatchId] = useState("");
  const [className, setClassName] = useState("CSE-A");

  const [subjDeptId, setSubjDeptId] = useState("");
  const [subjSemId, setSubjSemId] = useState("");
  const [subjName, setSubjName] = useState("");
  const [subjCode, setSubjCode] = useState("");
  const [subjCredits, setSubjCredits] = useState("4");

  const [assignSubjId, setAssignSubjId] = useState("");
  const [assignClassId, setAssignClassId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignSemId, setAssignSemId] = useState("");
  const [assignYearId, setAssignYearId] = useState("");

  const [enrollClassId, setEnrollClassId] = useState("");
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollRoll, setEnrollRoll] = useState("");

  const [routClassId, setRoutClassId] = useState("");
  const [routOfferingId, setRoutOfferingId] = useState("");
  const [routTeacherId, setRoutTeacherId] = useState("");
  const [routDay, setRoutDay] = useState("Monday");
  const [routStart, setRoutStart] = useState("10:00");
  const [routEnd, setRoutEnd] = useState("11:00");
  const [routRoom, setRoutRoom] = useState("Room 204");

  async function loadAllData() {
    setLoading(true);
    try {
      const [
        deptRes,
        progRes,
        yearRes,
        semRes,
        batchRes,
        classRes,
        subjRes,
        offeringRes,
        profileRes,
        enrollRes,
        routRes,
      ] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("programs").select("*").order("name"),
        supabase.from("academic_years").select("*").order("name"),
        supabase.from("semesters").select("*").order("name"),
        supabase.from("batches").select("*").order("name"),
        supabase.from("classes").select("*").order("name"),
        supabase.from("subjects").select("*").order("name"),
        supabase.from("subject_offerings").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("class_enrollments").select("*"),
        supabase.from("routines").select("*"),
      ]);

      if (deptRes.data) setDepartments(deptRes.data as Department[]);
      if (progRes.data) setPrograms(progRes.data as Program[]);
      if (yearRes.data) setAcademicYears(yearRes.data as AcademicYear[]);
      if (semRes.data) setSemesters(semRes.data as Semester[]);
      if (batchRes.data) setBatches(batchRes.data as Batch[]);
      if (classRes.data) setClasses(classRes.data as ClassItem[]);
      if (subjRes.data) setSubjects(subjRes.data as Subject[]);
      if (offeringRes.data) setSubjectOfferings(offeringRes.data as SubjectOffering[]);
      if (enrollRes.data) setEnrollments(enrollRes.data as ClassEnrollment[]);
      if (routRes.data) setRoutines(routRes.data as RoutineEntry[]);

      if (profileRes.data) {
        const allProfs = profileRes.data as UserProfile[];
        setTeachers(allProfs.filter((p) => p.role === "teacher" || p.role === "super_admin"));
        setStudents(allProfs.filter((p) => p.role === "student"));
      }
    } catch (err: any) {
      if (showError) showError(err.message || "Failed to load coordinator data.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAllData();
  }, []);

  // Creation Handlers
  async function createDepartment() {
    if (!deptName.trim()) return;
    const { error } = await supabase.from("departments").insert([{ name: deptName, code: deptCode }]);
    if (error) showError?.(error.message);
    else {
      notify?.("Department created.");
      setDeptName(""); setDeptCode("");
      loadAllData();
    }
  }

  async function createProgram() {
    if (!progName.trim() || !progDeptId) return;
    const { error } = await supabase.from("programs").insert([{ department_id: progDeptId, name: progName, level: progLevel }]);
    if (error) showError?.(error.message);
    else {
      notify?.("Program created.");
      setProgName("");
      loadAllData();
    }
  }

  async function createAcademicYear() {
    if (!yearName.trim()) return;
    const { error } = await supabase.from("academic_years").insert([{ name: yearName }]);
    if (error) showError?.(error.message);
    else {
      notify?.("Academic Year created.");
      loadAllData();
    }
  }

  async function createSemester() {
    if (!semName.trim()) return;
    const { error } = await supabase.from("semesters").insert([{ name: semName }]);
    if (error) showError?.(error.message);
    else {
      notify?.("Semester created.");
      loadAllData();
    }
  }

  async function createBatch() {
    if (!batchName.trim() || !batchDeptId) return;
    const { error } = await supabase.from("batches").insert([{ department_id: batchDeptId, name: batchName }]);
    if (error) showError?.(error.message);
    else {
      notify?.("Batch created.");
      setBatchName("");
      loadAllData();
    }
  }

  async function createClass() {
    if (!className.trim() || !classBatchId) return;
    const { error } = await supabase.from("classes").insert([{ batch_id: classBatchId, name: className }]);
    if (error) showError?.(error.message);
    else {
      notify?.("Class created.");
      setClassName("");
      loadAllData();
    }
  }

  async function createSubject() {
    if (!subjName.trim() || !subjDeptId) return;
    const { error } = await supabase.from("subjects").insert([
      {
        department_id: subjDeptId,
        semester_id: subjSemId || null,
        name: subjName,
        code: subjCode,
        credits: parseFloat(subjCredits) || 4,
      },
    ]);
    if (error) showError?.(error.message);
    else {
      notify?.("Subject created successfully.");
      setSubjName(""); setSubjCode("");
      loadAllData();
    }
  }

  async function createSubjectOffering() {
    if (!assignSubjId || !assignClassId || !assignTeacherId) return;
    const { error } = await supabase.from("subject_offerings").insert([
      {
        subject_id: assignSubjId,
        class_id: assignClassId,
        teacher_id: assignTeacherId,
        semester_id: assignSemId || null,
        academic_year_id: assignYearId || null,
      },
    ]);
    if (error) showError?.(error.message);
    else {
      notify?.("Subject offering (Teacher Assignment) created successfully!");
      loadAllData();
    }
  }

  async function enrollStudent() {
    if (!enrollStudentId || !enrollClassId) return;
    const { error } = await supabase.from("class_enrollments").insert([
      { student_id: enrollStudentId, class_id: enrollClassId, roll_number: enrollRoll },
    ]);
    if (error) showError?.(error.message);
    else {
      notify?.("Student enrolled in class.");
      setEnrollRoll("");
      loadAllData();
    }
  }

  async function createRoutineEntry() {
    if (!routClassId || !routOfferingId || !routTeacherId) return;
    const { error } = await supabase.from("routines").insert([
      {
        class_id: routClassId,
        subject_offering_id: routOfferingId,
        teacher_id: routTeacherId,
        day_of_week: routDay,
        start_time: routStart,
        end_time: routEnd,
        room: routRoom,
      },
    ]);
    if (error) showError?.(error.message);
    else {
      notify?.("Routine entry added.");
      loadAllData();
    }
  }

  async function deleteRecord(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) showError?.(error.message);
    else {
      notify?.("Deleted successfully.");
      loadAllData();
    }
  }

  return (
    <div className="coord-dashboard">
      <style>{`
        .coord-dashboard { display: flex; flex-direction: column; gap: 20px; }
        .subnav { display: flex; flex-wrap: wrap; gap: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .subnav-btn { padding: 8px 14px; border: none; background: transparent; font-weight: 600; font-size: 0.85rem; color: #4b5563; cursor: pointer; border-radius: 6px; transition: all 0.2s ease; }
        .subnav-btn:hover { background: #f3f4f6; color: #111827; }
        .subnav-btn.active { background: #111827; color: #ffffff; }
        .coord-card { background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: #374151; }
        .form-group input, .form-group select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; }
        .grid-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
        .item-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; position: relative; }
        .item-title { font-weight: 700; color: #111827; font-size: 0.95rem; }
        .item-sub { font-size: 0.8rem; color: #6b7280; margin-top: 2px; }
        .del-btn { position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px; }
        .del-btn:hover { color: #b91c1c; }
      `}</style>

      {/* SUB NAVIGATION */}
      <div className="subnav">
        <button className={`subnav-btn ${subTab === "overview" ? "active" : ""}`} onClick={() => setSubTab("overview")}>
          📊 Overview
        </button>
        <button className={`subnav-btn ${subTab === "departments" ? "active" : ""}`} onClick={() => setSubTab("departments")}>
          🏢 Departments ({departments.length})
        </button>
        <button className={`subnav-btn ${subTab === "programs" ? "active" : ""}`} onClick={() => setSubTab("programs")}>
          🎓 Programs ({programs.length})
        </button>
        <button className={`subnav-btn ${subTab === "academic_years" ? "active" : ""}`} onClick={() => setSubTab("academic_years")}>
          📅 Academic Years ({academicYears.length})
        </button>
        <button className={`subnav-btn ${subTab === "semesters" ? "active" : ""}`} onClick={() => setSubTab("semesters")}>
          📆 Semesters ({semesters.length})
        </button>
        <button className={`subnav-btn ${subTab === "batches" ? "active" : ""}`} onClick={() => setSubTab("batches")}>
          👥 Batches ({batches.length})
        </button>
        <button className={`subnav-btn ${subTab === "classes" ? "active" : ""}`} onClick={() => setSubTab("classes")}>
          🏫 Classes ({classes.length})
        </button>
        <button className={`subnav-btn ${subTab === "subjects" ? "active" : ""}`} onClick={() => setSubTab("subjects")}>
          📚 Subjects ({subjects.length})
        </button>
        <button className={`subnav-btn ${subTab === "assignments" ? "active" : ""}`} onClick={() => setSubTab("assignments")}>
          🔗 Teacher Assignments ({subjectOfferings.length})
        </button>
        <button className={`subnav-btn ${subTab === "students" ? "active" : ""}`} onClick={() => setSubTab("students")}>
          🎒 Student Enrollments ({enrollments.length})
        </button>
        <button className={`subnav-btn ${subTab === "routines" ? "active" : ""}`} onClick={() => setSubTab("routines")}>
          ⏰ Routine ({routines.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center" }}>Loading Academic Hierarchy...</div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {subTab === "overview" && (
            <div className="coord-card">
              <h3>Academic Workflow Summary</h3>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "20px" }}>
                Construct and manage academic structures: Departments → Programs → Batches → Classes → Subjects → Subject Offerings.
              </p>
              <div className="grid-list">
                <div className="item-card"><div className="item-title">{departments.length} Departments</div></div>
                <div className="item-card"><div className="item-title">{programs.length} Programs</div></div>
                <div className="item-card"><div className="item-title">{batches.length} Batches</div></div>
                <div className="item-card"><div className="item-title">{classes.length} Classes</div></div>
                <div className="item-card"><div className="item-title">{subjects.length} Subjects</div></div>
                <div className="item-card"><div className="item-title">{subjectOfferings.length} Subject Offerings</div></div>
                <div className="item-card"><div className="item-title">{teachers.length} Teachers</div></div>
                <div className="item-card"><div className="item-title">{students.length} Enrolled Students</div></div>
              </div>
            </div>
          )}

          {/* DEPARTMENTS TAB */}
          {subTab === "departments" && (
            <div className="coord-card">
              <h3>Add Department</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Department Name</label>
                  <input placeholder="e.g. Computer Science & Engineering" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Code</label>
                  <input placeholder="e.g. CSE" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
                </div>
              </div>
              <button className="primary-btn" onClick={createDepartment}><Plus size={16} /> Create Department</button>
              <div className="grid-list">
                {departments.map((d) => (
                  <div className="item-card" key={d.id}>
                    <button className="del-btn" onClick={() => deleteRecord("departments", d.id)}><Trash2 size={16} /></button>
                    <div className="item-title">{d.name}</div>
                    <div className="item-sub">Code: {d.code || "N/A"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROGRAMS TAB */}
          {subTab === "programs" && (
            <div className="coord-card">
              <h3>Add Program</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select value={progDeptId} onChange={(e) => setProgDeptId(e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Program Name</label>
                  <input placeholder="e.g. B.Tech Computer Science" value={progName} onChange={(e) => setProgName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <input value={progLevel} onChange={(e) => setProgLevel(e.target.value)} />
                </div>
              </div>
              <button className="primary-btn" onClick={createProgram}><Plus size={16} /> Create Program</button>
              <div className="grid-list">
                {programs.map((p) => (
                  <div className="item-card" key={p.id}>
                    <button className="del-btn" onClick={() => deleteRecord("programs", p.id)}><Trash2 size={16} /></button>
                    <div className="item-title">{p.name}</div>
                    <div className="item-sub">Level: {p.level || "B.Tech"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACADEMIC YEARS TAB */}
          {subTab === "academic_years" && (
            <div className="coord-card">
              <h3>Academic Years</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Academic Year</label>
                  <input value={yearName} onChange={(e) => setYearName(e.target.value)} placeholder="2026-2027" />
                </div>
              </div>
              <button className="primary-btn" onClick={createAcademicYear}><Plus size={16} /> Add Year</button>
              <div className="grid-list">
                {academicYears.map((y) => (
                  <div className="item-card" key={y.id}>
                    <button className="del-btn" onClick={() => deleteRecord("academic_years", y.id)}><Trash2 size={16} /></button>
                    <div className="item-title">{y.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEMESTERS TAB */}
          {subTab === "semesters" && (
            <div className="coord-card">
              <h3>Semesters</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Semester Name</label>
                  <input value={semName} onChange={(e) => setSemName(e.target.value)} placeholder="Semester 5" />
                </div>
              </div>
              <button className="primary-btn" onClick={createSemester}><Plus size={16} /> Add Semester</button>
              <div className="grid-list">
                {semesters.map((s) => (
                  <div className="item-card" key={s.id}>
                    <button className="del-btn" onClick={() => deleteRecord("semesters", s.id)}><Trash2 size={16} /></button>
                    <div className="item-title">{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BATCHES TAB */}
          {subTab === "batches" && (
            <div className="coord-card">
              <h3>Batches</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select value={batchDeptId} onChange={(e) => setBatchDeptId(e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Batch Name</label>
                  <input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="2024-2028" />
                </div>
              </div>
              <button className="primary-btn" onClick={createBatch}><Plus size={16} /> Create Batch</button>
              <div className="grid-list">
                {batches.map((b) => (
                  <div className="item-card" key={b.id}>
                    <button className="del-btn" onClick={() => deleteRecord("batches", b.id)}><Trash2 size={16} /></button>
                    <div className="item-title">{b.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLASSES TAB */}
          {subTab === "classes" && (
            <div className="coord-card">
              <h3>Classes</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Batch</label>
                  <select value={classBatchId} onChange={(e) => setClassBatchId(e.target.value)}>
                    <option value="">Select Batch</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Class Name</label>
                  <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="CSE-A" />
                </div>
              </div>
              <button className="primary-btn" onClick={createClass}><Plus size={16} /> Create Class</button>
              <div className="grid-list">
                {classes.map((c) => (
                  <div className="item-card" key={c.id}>
                    <button className="del-btn" onClick={() => deleteRecord("classes", c.id)}><Trash2 size={16} /></button>
                    <div className="item-title">{c.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBJECTS TAB */}
          {subTab === "subjects" && (
            <div className="coord-card">
              <h3>Create Subject</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select value={subjDeptId} onChange={(e) => setSubjDeptId(e.target.value)}>
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select value={subjSemId} onChange={(e) => setSubjSemId(e.target.value)}>
                    <option value="">Select Semester</option>
                    {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject Code</label>
                  <input placeholder="CS501" value={subjCode} onChange={(e) => setSubjCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Subject Name</label>
                  <input placeholder="Database Management Systems" value={subjName} onChange={(e) => setSubjName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Credits</label>
                  <input type="number" value={subjCredits} onChange={(e) => setSubjCredits(e.target.value)} />
                </div>
              </div>
              <button className="primary-btn" onClick={createSubject}><Plus size={16} /> Create Subject</button>
              <div className="grid-list">
                {subjects.map((s) => (
                  <div className="item-card" key={s.id}>
                    <button className="del-btn" onClick={() => deleteRecord("subjects", s.id)}><Trash2 size={16} /></button>
                    <div className="item-title">{s.code} - {s.name}</div>
                    <div className="item-sub">Credits: {s.credits || 4}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEACHER ASSIGNMENT / SUBJECT OFFERINGS */}
          {subTab === "assignments" && (
            <div className="coord-card">
              <h3>Teacher Assignment (Create Subject Offering)</h3>
              <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "16px" }}>
                Formula: CLASS + SUBJECT + TEACHER = SUBJECT OFFERING
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label>Subject</label>
                  <select value={assignSubjId} onChange={(e) => setAssignSubjId(e.target.value)}>
                    <option value="">Select Subject</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Class</label>
                  <select value={assignClassId} onChange={(e) => setAssignClassId(e.target.value)}>
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Teacher</label>
                  <select value={assignTeacherId} onChange={(e) => setAssignTeacherId(e.target.value)}>
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select value={assignYearId} onChange={(e) => setAssignYearId(e.target.value)}>
                    <option value="">Select Year</option>
                    {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select value={assignSemId} onChange={(e) => setAssignSemId(e.target.value)}>
                    <option value="">Select Semester</option>
                    {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <button className="primary-btn" onClick={createSubjectOffering}><Plus size={16} /> Assign Teacher (Create Offering)</button>
              <div className="grid-list">
                {subjectOfferings.map((so) => {
                  const s = subjects.find((subj) => subj.id === so.subject_id);
                  const c = classes.find((cls) => cls.id === so.class_id);
                  const t = teachers.find((tch) => tch.id === so.teacher_id);
                  return (
                    <div className="item-card" key={so.id}>
                      <button className="del-btn" onClick={() => deleteRecord("subject_offerings", so.id)}><Trash2 size={16} /></button>
                      <div className="item-title">{s?.name || "Subject"} ({c?.name || "Class"})</div>
                      <div className="item-sub">👨‍🏫 Teacher: {t?.full_name || t?.email || "Unassigned"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STUDENT ENROLLMENTS TAB */}
          {subTab === "students" && (
            <div className="coord-card">
              <h3>Enroll Student into Class</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Student</label>
                  <select value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)}>
                    <option value="">Select Student</option>
                    {students.map((st) => <option key={st.id} value={st.id}>{st.full_name || st.email}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Class</label>
                  <select value={enrollClassId} onChange={(e) => setEnrollClassId(e.target.value)}>
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Roll Number / Code</label>
                  <input placeholder="e.g. BCS-01" value={enrollRoll} onChange={(e) => setEnrollRoll(e.target.value)} />
                </div>
              </div>
              <button className="primary-btn" onClick={enrollStudent}><Plus size={16} /> Enroll Student</button>
              <div className="grid-list">
                {enrollments.map((en) => {
                  const st = students.find((s) => s.id === en.student_id);
                  const c = classes.find((cls) => cls.id === en.class_id);
                  return (
                    <div className="item-card" key={en.id}>
                      <button className="del-btn" onClick={() => deleteRecord("class_enrollments", en.id)}><Trash2 size={16} /></button>
                      <div className="item-title">{st?.full_name || st?.email}</div>
                      <div className="item-sub">Class: {c?.name} | Roll: {en.roll_number || "N/A"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ROUTINES TAB */}
          {subTab === "routines" && (
            <div className="coord-card">
              <h3>Manage Class Routines</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Class</label>
                  <select value={routClassId} onChange={(e) => setRoutClassId(e.target.value)}>
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject Offering</label>
                  <select value={routOfferingId} onChange={(e) => setRoutOfferingId(e.target.value)}>
                    <option value="">Select Subject Offering</option>
                    {subjectOfferings.map((so) => {
                      const s = subjects.find((subj) => subj.id === so.subject_id);
                      const c = classes.find((cls) => cls.id === so.class_id);
                      return <option key={so.id} value={so.id}>{s?.name} ({c?.name})</option>;
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Teacher</label>
                  <select value={routTeacherId} onChange={(e) => setRoutTeacherId(e.target.value)}>
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Day of Week</label>
                  <select value={routDay} onChange={(e) => setRoutDay(e.target.value)}>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input value={routStart} onChange={(e) => setRoutStart(e.target.value)} placeholder="10:00" />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input value={routEnd} onChange={(e) => setRoutEnd(e.target.value)} placeholder="11:00" />
                </div>
                <div className="form-group">
                  <label>Room Number</label>
                  <input value={routRoom} onChange={(e) => setRoutRoom(e.target.value)} placeholder="Room 204" />
                </div>
              </div>
              <button className="primary-btn" onClick={createRoutineEntry}><Plus size={16} /> Add Routine Entry</button>
              <div className="grid-list">
                {routines.map((r) => {
                  const c = classes.find((cls) => cls.id === r.class_id);
                  const t = teachers.find((tch) => tch.id === r.teacher_id);
                  const offering = subjectOfferings.find((so) => so.id === r.subject_offering_id);
                  const s = subjects.find((subj) => subj.id === offering?.subject_id);
                  return (
                    <div className="item-card" key={r.id}>
                      <button className="del-btn" onClick={() => deleteRecord("routines", r.id)}><Trash2 size={16} /></button>
                      <div className="item-title">{r.day_of_week} | {r.start_time} - {r.end_time}</div>
                      <div className="item-sub">📚 {s?.name} ({c?.name})</div>
                      <div className="item-sub">👨‍🏫 {t?.full_name || t?.email} | 🚪 {r.room || "Room N/A"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
