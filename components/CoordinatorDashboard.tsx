"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import * as XLSX from "xlsx";
import {
  Building2, GraduationCap, Calendar, Layers, Users, BookOpen, UserCheck, Plus, Trash2, Clock, MapPin, Upload, RefreshCw, Search, CheckCircle, FileSpreadsheet, Edit, Power, PowerOff
} from "lucide-react";

type Department = { id: string; name: string; code?: string | null; is_active?: boolean };
type Program = { id: string; department_id: string; name: string; level?: string; duration_years?: number };
type AcademicYear = { id: string; name: string; is_current?: boolean };
type Semester = { id: string; name: string; is_active?: boolean };
type Batch = { id: string; department_id: string; name: string; is_active?: boolean };
type ClassItem = { id: string; batch_id: string; name: string; is_active?: boolean };
type Subject = { id: string; department_id: string; name: string; code?: string; credits?: number; semester_id?: string; is_active?: boolean };
type SubjectOffering = {
  id: string; subject_id: string; class_id: string; teacher_id: string; semester_id: string; academic_year_id: string; is_active?: boolean;
};
type ClassEnrollment = { id: string; student_id: string; legacy_student_id?: string; class_id: string; roll_number?: string };
type RoutineEntry = { id: string; class_id: string; subject_offering_id: string; teacher_id: string; day_of_week: string; start_time: string; end_time: string; room?: string };
type RosterStudent = { id: string; student_id: string; name: string; slr?: string; department_id?: string; batch_id?: string; group_id?: string; attendance_code?: string; is_active?: boolean; };
type StudentGroup = { id: string; batch_id: string; name: string; is_active?: boolean; created_at?: string };

type SubTab = "overview" | "departments" | "programs" | "academic_years" | "semesters" | "batches" | "groups" | "classes" | "subjects" | "assignments" | "students" | "routines" | "roster";

export default function CoordinatorDashboard({
  userProfile, onReload, notify, showError,
}: {
  userProfile: UserProfile; onReload?: () => void; notify?: (msg: string) => void; showError?: (msg: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Entities state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectOfferings, setSubjectOfferings] = useState<SubjectOffering[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [rosterStudents, setRosterStudents] = useState<RosterStudent[]>([]);
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

  const [groupBatchId, setGroupBatchId] = useState("");
  const [groupName, setGroupName] = useState("");

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

  const [rostStudentId, setRostStudentId] = useState("");
  const [rostName, setRostName] = useState("");
  const [rostSlr, setRostSlr] = useState("");
  const [rostDeptId, setRostDeptId] = useState("");
  const [rostBatchId, setRostBatchId] = useState("");
  const [rostGroupId, setRostGroupId] = useState("");
  const [rostAttCode, setRostAttCode] = useState("");
  const [importing, setImporting] = useState(false);


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
        deptRes, progRes, yearRes, semRes, batchRes, groupRes,
        classRes, subjRes, offeringRes, profileRes, enrollRes, routRes, rosterRes,
      ] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("programs").select("*").order("name"),
        supabase.from("academic_years").select("*").order("name"),
        supabase.from("semesters").select("*").order("name"),
        supabase.from("batches").select("*").order("name"),
        supabase.from("student_groups").select("*").order("name"),
        supabase.from("classes").select("*").order("name"),
        supabase.from("subjects").select("*").order("name"),
        supabase.from("subject_offerings").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("class_enrollments").select("*"),
        supabase.from("routines").select("*"),
        supabase.from("students").select("*").order("name"),
      ]);

      if (deptRes.data) setDepartments(deptRes.data as Department[]);
      if (progRes.data) setPrograms(progRes.data as Program[]);
      if (yearRes.data) setAcademicYears(yearRes.data as AcademicYear[]);
      if (semRes.data) setSemesters(semRes.data as Semester[]);
      if (batchRes.data) setBatches(batchRes.data as Batch[]);
      if (groupRes.data) setGroups(groupRes.data as StudentGroup[]);
      if (classRes.data) setClasses(classRes.data as ClassItem[]);
      if (subjRes.data) setSubjects(subjRes.data as Subject[]);
      if (offeringRes.data) setSubjectOfferings(offeringRes.data as SubjectOffering[]);
      if (enrollRes.data) setEnrollments(enrollRes.data as ClassEnrollment[]);
      if (routRes.data) setRoutines(routRes.data as RoutineEntry[]);
      if (rosterRes.data) setRosterStudents(rosterRes.data as RosterStudent[]);

      if (profileRes.data) {
        const allProfs = profileRes.data as UserProfile[];
        setTeachers(allProfs.filter((p) => p.role === "teacher" || p.role === "super_admin" || p.role === "coordinator"));
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

  const resetForms = () => {
    setRostStudentId(""); setRostName(""); setRostSlr(""); setRostDeptId(""); setRostBatchId(""); setRostGroupId(""); setRostAttCode("");
    setEditingId(null);
    setDeptName(""); setDeptCode("");
    setProgName(""); setProgDeptId(""); setProgLevel("B.Tech");
    setYearName("");
    setSemName("");
    setBatchName(""); setBatchDeptId("");
    setGroupName(""); setGroupBatchId("");
    setClassName(""); setClassBatchId("");
    setSubjName(""); setSubjCode(""); setSubjDeptId(""); setSubjSemId(""); setSubjCredits("4");
    setAssignSubjId(""); setAssignClassId(""); setAssignTeacherId(""); setAssignSemId(""); setAssignYearId("");
    setEnrollClassId(""); setEnrollStudentId(""); setEnrollRoll("");
    setRoutClassId(""); setRoutOfferingId(""); setRoutTeacherId(""); setRoutDay("Monday"); setRoutStart("10:00"); setRoutEnd("11:00"); setRoutRoom("Room 204");
  };

  const handleTabChange = (tab: SubTab) => {
    setSubTab(tab);
    setSearchQuery("");
    resetForms();
  };

  const handleEdit = (type: string, item: any) => {
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
  };

  async function toggleStatus(table: string, id: string, currentStatus: boolean) {
    if (table === 'academic_years') {
      const { error } = await supabase.from(table).update({ is_current: !currentStatus }).eq("id", id);
      if (error) showError?.(error.message); else { notify?.("Status updated."); loadAllData(); }
      return;
    }
    const { error } = await supabase.from(table).update({ is_active: !currentStatus }).eq("id", id);
    if (error) showError?.(error.message);
    else { notify?.("Status updated."); loadAllData(); }
  }

  async function deleteRecord(table: string, id: string) {
    if (!window.confirm("Are you sure you want to delete this record permanently?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) showError?.("Cannot delete this record because it is referenced by other data. Try deactivating it instead.");
    else { notify?.("Deleted successfully."); loadAllData(); }
  }

  // --- SAVE FUNCTIONS (Add / Edit) ---
  async function saveDepartment() {
    if (!deptName.trim()) { showError?.("Department name is required."); return; }
    if (departments.find(d => d.name.toLowerCase() === deptName.trim().toLowerCase() && d.id !== editingId)) {
      showError?.("Department with this name already exists."); return;
    }
    setFormLoading(true);
    const data = { name: deptName.trim(), code: deptCode.trim() };
    const { error } = editingId
      ? await supabase.from("departments").update(data).eq("id", editingId)
      : await supabase.from("departments").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Department updated." : "Department created."); resetForms(); loadAllData(); }
  }

  async function saveProgram() {
    if (!progName.trim() || !progDeptId) { showError?.("Name and Department are required."); return; }
    if (programs.find(p => p.name.toLowerCase() === progName.trim().toLowerCase() && p.department_id === progDeptId && p.id !== editingId)) {
      showError?.("Program with this name already exists in this department."); return;
    }
    setFormLoading(true);
    const data = { name: progName.trim(), department_id: progDeptId, level: progLevel.trim() };
    const { error } = editingId
      ? await supabase.from("programs").update(data).eq("id", editingId)
      : await supabase.from("programs").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Program updated." : "Program created."); resetForms(); loadAllData(); }
  }

  async function saveAcademicYear() {
    if (!yearName.trim()) { showError?.("Year name is required."); return; }
    if (academicYears.find(y => y.name.toLowerCase() === yearName.trim().toLowerCase() && y.id !== editingId)) {
      showError?.("Academic Year already exists."); return;
    }
    setFormLoading(true);
    const data = { name: yearName.trim() };
    const { error } = editingId
      ? await supabase.from("academic_years").update(data).eq("id", editingId)
      : await supabase.from("academic_years").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Academic Year updated." : "Academic Year created."); resetForms(); loadAllData(); }
  }

  async function saveSemester() {
    if (!semName.trim()) { showError?.("Semester name is required."); return; }
    if (semesters.find(s => s.name.toLowerCase() === semName.trim().toLowerCase() && s.id !== editingId)) {
      showError?.("Semester already exists."); return;
    }
    setFormLoading(true);
    const data = { name: semName.trim() };
    const { error } = editingId
      ? await supabase.from("semesters").update(data).eq("id", editingId)
      : await supabase.from("semesters").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Semester updated." : "Semester created."); resetForms(); loadAllData(); }
  }

  async function saveBatch() {
    if (!batchName.trim() || !batchDeptId) { showError?.("Name and Department are required."); return; }
    if (batches.find(b => b.name.toLowerCase() === batchName.trim().toLowerCase() && b.department_id === batchDeptId && b.id !== editingId)) {
      showError?.("Batch already exists in this department."); return;
    }
    setFormLoading(true);
    const data = { name: batchName.trim(), department_id: batchDeptId };
    const { error } = editingId
      ? await supabase.from("batches").update(data).eq("id", editingId)
      : await supabase.from("batches").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Batch updated." : "Batch created."); resetForms(); loadAllData(); if(onReload) onReload(); }
  }

  async function saveGroup() {
    if (!groupName.trim() || !groupBatchId) { showError?.("Name and Batch are required."); return; }
    if (groups.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase() && g.batch_id === groupBatchId && g.id !== editingId)) {
      showError?.("Group already exists in this batch."); return;
    }
    setFormLoading(true);
    const data = { name: groupName.trim(), batch_id: groupBatchId };
    const { error } = editingId
      ? await supabase.from("student_groups").update(data).eq("id", editingId)
      : await supabase.from("student_groups").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Group updated." : "Group created."); resetForms(); loadAllData(); if(onReload) onReload(); }
  }

  async function saveClass() {
    if (!className.trim() || !classBatchId) { showError?.("Name and Batch are required."); return; }
    if (classes.find(c => c.name.toLowerCase() === className.trim().toLowerCase() && c.batch_id === classBatchId && c.id !== editingId)) {
      showError?.("Class already exists in this batch."); return;
    }
    setFormLoading(true);
    const data = { name: className.trim(), batch_id: classBatchId };
    const { error } = editingId
      ? await supabase.from("classes").update(data).eq("id", editingId)
      : await supabase.from("classes").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Class updated." : "Class created."); resetForms(); loadAllData(); }
  }

  
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

  async function saveSubject() {
    if (!subjName.trim() || !subjDeptId) { showError?.("Name and Department are required."); return; }
    if (subjects.find(s => s.name.toLowerCase() === subjName.trim().toLowerCase() && s.department_id === subjDeptId && s.id !== editingId)) {
      showError?.("Subject already exists in this department."); return;
    }
    setFormLoading(true);
    const data = {
      name: subjName.trim(), code: subjCode.trim(), department_id: subjDeptId,
      semester_id: subjSemId || null, credits: parseFloat(subjCredits) || 4
    };
    const { error } = editingId
      ? await supabase.from("subjects").update(data).eq("id", editingId)
      : await supabase.from("subjects").insert([data]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.(editingId ? "Subject updated." : "Subject created."); resetForms(); loadAllData(); }
  }

  async function saveSubjectOffering() {
    if (!assignSubjId || !assignClassId || !assignTeacherId) { showError?.("Subject, Class, and Teacher are required."); return; }
    if (subjectOfferings.find(so => so.subject_id === assignSubjId && so.class_id === assignClassId && so.teacher_id === assignTeacherId && so.semester_id === assignSemId && so.academic_year_id === assignYearId)) {
      showError?.("This exact subject offering already exists."); return;
    }
    setFormLoading(true);
    const { error } = await supabase.from("subject_offerings").insert([{
      subject_id: assignSubjId, class_id: assignClassId, teacher_id: assignTeacherId,
      semester_id: assignSemId || null, academic_year_id: assignYearId || null,
    }]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.("Subject offering created successfully."); resetForms(); loadAllData(); }
  }

  async function enrollStudent() {
    if (!enrollStudentId || !enrollClassId) { showError?.("Student and Class are required."); return; }
    if (enrollments.find(e => e.legacy_student_id === enrollStudentId && e.class_id === enrollClassId)) {
      showError?.("Student is already enrolled in this class."); return;
    }
    setFormLoading(true);
    // enrollStudentId now refers to rosterStudent.id (which goes to legacy_student_id)
    const { error } = await supabase.from("class_enrollments").insert([{ legacy_student_id: enrollStudentId, class_id: enrollClassId, roll_number: enrollRoll }]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.("Student enrolled in class."); resetForms(); loadAllData(); }
  }

    async function saveRoutineEntry() {
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
    setFormLoading(true);
    const { error } = await supabase.from("routines").insert([{
      class_id: routClassId, subject_offering_id: routOfferingId, teacher_id: routTeacherId,
      day_of_week: routDay, start_time: routStart, end_time: routEnd, room: routRoom,
    }]);
    setFormLoading(false);
    if (error) showError?.(error.message);
    else { notify?.("Routine entry added."); resetForms(); loadAllData(); }
  }

  const renderFilter = () => (
    <div className="filter-bar">
      <Search size={18} color="#6b7280" />
      <input type="text" placeholder="Filter records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
    </div>
  );

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
        .form-group input, .form-group select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; background: #f9fafb; }
        .form-group input:focus, .form-group select:focus { border-color: #3b82f6; outline: none; background: #fff; }
        .grid-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
        .item-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .item-card.inactive { opacity: 0.6; background: #f3f4f6; }
        .item-title { font-weight: 700; color: #111827; font-size: 0.95rem; margin-bottom: 4px; padding-right: 60px; }
        .item-sub { font-size: 0.8rem; color: #6b7280; margin-top: 2px; }
        .actions { position: absolute; top: 12px; right: 12px; display: flex; gap: 6px; }
        .icon-btn { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; color: #4b5563; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; }
        .icon-btn:hover { background: #e5e7eb; color: #111827; }
        .icon-btn.delete:hover { color: #ef4444; border-color: #fca5a5; background: #fee2e2; }
        .primary-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #111827; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .primary-btn:hover { background: #374151; }
        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .secondary-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #f3f4f6; color: #111827; border: 1px solid #e5e7eb; border-radius: 6px; font-weight: 600; cursor: pointer; margin-left: 8px; }
        .secondary-btn:hover { background: #e5e7eb; }
        .filter-bar { display: flex; align-items: center; gap: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; }
        .filter-bar input { border: none; background: transparent; outline: none; width: 100%; font-size: 0.9rem; }
        .empty-state { text-align: center; padding: 40px; color: #6b7280; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db; margin-top: 16px; }
      `}</style>

      {/* SUB NAVIGATION */}
      <div className="subnav">
        <button className={`subnav-btn ${subTab === "overview" ? "active" : ""}`} onClick={() => handleTabChange("overview")}>📊 Overview</button>
        <button className={`subnav-btn ${subTab === "departments" ? "active" : ""}`} onClick={() => handleTabChange("departments")}>🏢 Departments ({departments.length})</button>
        <button className={`subnav-btn ${subTab === "programs" ? "active" : ""}`} onClick={() => handleTabChange("programs")}>🎓 Programs ({programs.length})</button>
        <button className={`subnav-btn ${subTab === "academic_years" ? "active" : ""}`} onClick={() => handleTabChange("academic_years")}>📅 Academic Years ({academicYears.length})</button>
        <button className={`subnav-btn ${subTab === "semesters" ? "active" : ""}`} onClick={() => handleTabChange("semesters")}>📆 Semesters ({semesters.length})</button>
        <button className={`subnav-btn ${subTab === "batches" ? "active" : ""}`} onClick={() => handleTabChange("batches")}>👥 Batches ({batches.length})</button>
        <button className={`subnav-btn ${subTab === "groups" ? "active" : ""}`} onClick={() => handleTabChange("groups")}>🗂️ Student Groups ({groups.length})</button>
        <button className={`subnav-btn ${subTab === "classes" ? "active" : ""}`} onClick={() => handleTabChange("classes")}>🏫 Classes ({classes.length})</button>
        <button className={`subnav-btn ${subTab === "subjects" ? "active" : ""}`} onClick={() => handleTabChange("subjects")}>📚 Subjects ({subjects.length})</button>
        <button className={`subnav-btn ${subTab === "assignments" ? "active" : ""}`} onClick={() => handleTabChange("assignments")}>🔗 Teacher Assignments ({subjectOfferings.length})</button>
        <button className={`subnav-btn ${subTab === "students" ? "active" : ""}`} onClick={() => handleTabChange("students")}>🎒 Enrollments ({enrollments.length})</button>
        <button className={`subnav-btn ${subTab === "routines" ? "active" : ""}`} onClick={() => handleTabChange("routines")}>⏰ Routine ({routines.length})</button>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}><RefreshCw className="animate-spin" style={{ margin: "0 auto 10px" }} /> Loading Academic Hierarchy...</div>
      ) : (
        <>
          {subTab === "overview" && (
            <div className="coord-card">
              <h3>Academic Workflow Summary</h3>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "20px" }}>
                Construct and manage academic structures: Departments → Programs → Batches → Groups → Classes → Subjects → Subject Offerings.
              </p>
              <div className="grid-list">
                <div className="item-card" onClick={() => handleTabChange("departments")} style={{ cursor: "pointer" }}><div className="item-title">{departments.length} Departments</div></div>
                <div className="item-card" onClick={() => handleTabChange("programs")} style={{ cursor: "pointer" }}><div className="item-title">{programs.length} Programs</div></div>
                <div className="item-card" onClick={() => handleTabChange("batches")} style={{ cursor: "pointer" }}><div className="item-title">{batches.length} Batches</div></div>
                <div className="item-card" onClick={() => handleTabChange("groups")} style={{ cursor: "pointer" }}><div className="item-title">{groups.length} Student Groups</div></div>
                <div className="item-card" onClick={() => handleTabChange("classes")} style={{ cursor: "pointer" }}><div className="item-title">{classes.length} Classes</div></div>
                <div className="item-card" onClick={() => handleTabChange("subjects")} style={{ cursor: "pointer" }}><div className="item-title">{subjects.length} Subjects</div></div>
                <div className="item-card" onClick={() => handleTabChange("assignments")} style={{ cursor: "pointer" }}><div className="item-title">{subjectOfferings.length} Subject Offerings</div></div>
                <div className="item-card"><div className="item-title">{teachers.length} Staff/Teachers</div></div>
                <div className="item-card" onClick={() => handleTabChange("students")} style={{ cursor: "pointer" }}><div className="item-title">{enrollments.length} Enrolled Students</div></div>
              </div>
            </div>
          )}

          {subTab === "departments" && (() => {
            const filtered = departments.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.code?.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Department" : "Add Department"}</h3>
              <div className="form-row">
                <div className="form-group"><label>Department Name *</label><input placeholder="e.g. Computer Science" value={deptName} onChange={e => setDeptName(e.target.value)} /></div>
                <div className="form-group"><label>Code</label><input placeholder="e.g. CSE" value={deptCode} onChange={e => setDeptCode(e.target.value)} /></div>
              </div>
              <div>
                <button className="primary-btn" disabled={formLoading} onClick={saveDepartment}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update" : "Create"} Department</button>
                {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              </div>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No departments found.</div> : (
                <div className="grid-list">
                  {filtered.map(d => (
                    <div className={`item-card ${d.is_active === false ? "inactive" : ""}`} key={d.id}>
                      <div className="actions">
                        <button className="icon-btn" title="Edit" onClick={() => handleEdit("departments", d)}><Edit size={14} /></button>
                        <button className="icon-btn" title={d.is_active === false ? "Activate" : "Deactivate"} onClick={() => toggleStatus("departments", d.id, d.is_active !== false)}>{d.is_active === false ? <Power size={14} /> : <PowerOff size={14} />}</button>
                        <button className="icon-btn delete" title="Delete" onClick={() => deleteRecord("departments", d.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-title">{d.name} {d.is_active === false && "(Inactive)"}</div>
                      <div className="item-sub">Code: {d.code || "N/A"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )})()}

          {subTab === "programs" && (() => {
            const filtered = programs.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Program" : "Add Program"}</h3>
              <div className="form-row">
                <div className="form-group"><label>Department *</label><select value={progDeptId} onChange={e => setProgDeptId(e.target.value)}><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="form-group"><label>Program Name *</label><input placeholder="e.g. B.Tech Computer Science" value={progName} onChange={e => setProgName(e.target.value)} /></div>
                <div className="form-group"><label>Level</label><input value={progLevel} onChange={e => setProgLevel(e.target.value)} /></div>
              </div>
              <div>
                <button className="primary-btn" disabled={formLoading} onClick={saveProgram}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update" : "Create"} Program</button>
                {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              </div>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No programs found.</div> : (
                <div className="grid-list">
                  {filtered.map(p => {
                    const dept = departments.find(d => d.id === p.department_id);
                    return (
                    <div className="item-card" key={p.id}>
                      <div className="actions">
                        <button className="icon-btn" title="Edit" onClick={() => handleEdit("programs", p)}><Edit size={14} /></button>
                        <button className="icon-btn delete" title="Delete" onClick={() => deleteRecord("programs", p.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-title">{p.name}</div>
                      <div className="item-sub">Level: {p.level || "N/A"}</div>
                      <div className="item-sub">Dept: {dept?.name || "Unknown"}</div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )})()}

          {/* ACADEMIC YEARS TAB */}
          {subTab === "academic_years" && (() => {
            const filtered = academicYears.filter(y => y.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Academic Year" : "Add Academic Year"}</h3>
              <div className="form-row">
                <div className="form-group"><label>Academic Year *</label><input value={yearName} onChange={e => setYearName(e.target.value)} placeholder="2026-2027" /></div>
              </div>
              <div>
                <button className="primary-btn" disabled={formLoading} onClick={saveAcademicYear}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update" : "Create"} Year</button>
                {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              </div>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No academic years found.</div> : (
                <div className="grid-list">
                  {filtered.map(y => (
                    <div className={`item-card ${!y.is_current ? "inactive" : ""}`} key={y.id}>
                      <div className="actions">
                        <button className="icon-btn" title="Edit" onClick={() => handleEdit("academic_years", y)}><Edit size={14} /></button>
                        <button className="icon-btn" title={y.is_current ? "Set Inactive" : "Set Active"} onClick={() => toggleStatus("academic_years", y.id, y.is_current || false)}>{!y.is_current ? <Power size={14} /> : <PowerOff size={14} />}</button>
                        <button className="icon-btn delete" title="Delete" onClick={() => deleteRecord("academic_years", y.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-title">{y.name} {y.is_current && <span style={{fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px'}}>Current</span>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )})()}

          {/* SEMESTERS TAB */}
          {subTab === "semesters" && (() => {
            const filtered = semesters.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Semester" : "Add Semester"}</h3>
              <div className="form-row">
                <div className="form-group"><label>Semester Name *</label><input value={semName} onChange={e => setSemName(e.target.value)} placeholder="Semester 5" /></div>
              </div>
              <div>
                <button className="primary-btn" disabled={formLoading} onClick={saveSemester}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update" : "Create"} Semester</button>
                {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              </div>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No semesters found.</div> : (
                <div className="grid-list">
                  {filtered.map(s => (
                    <div className={`item-card ${s.is_active === false ? "inactive" : ""}`} key={s.id}>
                      <div className="actions">
                        <button className="icon-btn" title="Edit" onClick={() => handleEdit("semesters", s)}><Edit size={14} /></button>
                        <button className="icon-btn" title={s.is_active === false ? "Activate" : "Deactivate"} onClick={() => toggleStatus("semesters", s.id, s.is_active !== false)}>{s.is_active === false ? <Power size={14} /> : <PowerOff size={14} />}</button>
                        <button className="icon-btn delete" title="Delete" onClick={() => deleteRecord("semesters", s.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-title">{s.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )})()}

          {/* BATCHES TAB */}
          {subTab === "batches" && (() => {
            const filtered = batches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Batch" : "Add Batch"}</h3>
              <div className="form-row">
                <div className="form-group"><label>Department *</label><select value={batchDeptId} onChange={e => setBatchDeptId(e.target.value)}><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="form-group"><label>Batch Name *</label><input value={batchName} onChange={e => setBatchName(e.target.value)} placeholder="2024-2028" /></div>
              </div>
              <div>
                <button className="primary-btn" disabled={formLoading} onClick={saveBatch}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update" : "Create"} Batch</button>
                {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              </div>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No batches found.</div> : (
                <div className="grid-list">
                  {filtered.map(b => {
                    const dept = departments.find(d => d.id === b.department_id);
                    return (
                    <div className={`item-card ${b.is_active === false ? "inactive" : ""}`} key={b.id}>
                      <div className="actions">
                        <button className="icon-btn" title="Edit" onClick={() => handleEdit("batches", b)}><Edit size={14} /></button>
                        <button className="icon-btn" title={b.is_active === false ? "Activate" : "Deactivate"} onClick={() => toggleStatus("batches", b.id, b.is_active !== false)}>{b.is_active === false ? <Power size={14} /> : <PowerOff size={14} />}</button>
                        <button className="icon-btn delete" title="Delete" onClick={() => deleteRecord("batches", b.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-title">{b.name}</div>
                      <div className="item-sub">Dept: {dept?.name || "Unknown"}</div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )})()}

          {/* GROUPS TAB */}
          {subTab === "groups" && (() => {
            const filtered = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Group" : "Add Group"}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Select Batch *</label>
                  <select value={groupBatchId} onChange={e => setGroupBatchId(e.target.value)}>
                    <option value="">-- Choose Batch --</option>
                    {batches.map(b => {
                      const dept = departments.find(d => d.id === b.department_id);
                      return <option key={b.id} value={b.id}>{b.name} {dept ? `(${dept.name})` : ""}</option>;
                    })}
                  </select>
                </div>
                <div className="form-group"><label>Group Name *</label><input type="text" placeholder="e.g. Group A" value={groupName} onChange={e => setGroupName(e.target.value)} /></div>
              </div>
              <div>
                <button className="primary-btn" disabled={formLoading} onClick={saveGroup}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update" : "Create"} Group</button>
                {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              </div>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No groups found.</div> : (
                <div className="grid-list">
                  {filtered.map(g => {
                    const batch = batches.find(b => b.id === g.batch_id);
                    const dept = batch ? departments.find(d => d.id === batch.department_id) : null;
                    return (
                      <div className={`item-card ${g.is_active === false ? "inactive" : ""}`} key={g.id}>
                        <div className="actions">
                          <button className="icon-btn" title="Edit" onClick={() => handleEdit("groups", g)}><Edit size={14} /></button>
                          <button className="icon-btn" title={g.is_active === false ? "Activate" : "Deactivate"} onClick={() => toggleStatus("student_groups", g.id, g.is_active !== false)}>{g.is_active === false ? <Power size={14} /> : <PowerOff size={14} />}</button>
                          <button className="icon-btn delete" title="Delete" onClick={() => deleteRecord("student_groups", g.id)}><Trash2 size={14} /></button>
                        </div>
                        <div className="item-title">Group {g.name}</div>
                        <div className="item-sub">Batch: {batch?.name || "Unassigned"}</div>
                        {dept && <div className="item-sub">Dept: {dept.name}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )})()}

          {/* CLASSES TAB */}
          {subTab === "classes" && (() => {
            const filtered = classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Class" : "Add Class"}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Batch *</label>
                  <select value={classBatchId} onChange={e => setClassBatchId(e.target.value)}>
                    <option value="">Select Batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Class Name *</label><input value={className} onChange={e => setClassName(e.target.value)} placeholder="CSE-A" /></div>
              </div>
              <div>
                <button className="primary-btn" disabled={formLoading} onClick={saveClass}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update" : "Create"} Class</button>
                {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              </div>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No classes found.</div> : (
                <div className="grid-list">
                  {filtered.map(c => {
                    const batch = batches.find(b => b.id === c.batch_id);
                    const dept = batch ? departments.find(d => d.id === batch.department_id) : null;
                    return (
                    <div className={`item-card ${c.is_active === false ? "inactive" : ""}`} key={c.id}>
                      <div className="actions">
                        <button className="icon-btn" title="Edit" onClick={() => handleEdit("classes", c)}><Edit size={14} /></button>
                        <button className="icon-btn" title={c.is_active === false ? "Activate" : "Deactivate"} onClick={() => toggleStatus("classes", c.id, c.is_active !== false)}>{c.is_active === false ? <Power size={14} /> : <PowerOff size={14} />}</button>
                        <button className="icon-btn delete" title="Delete" onClick={() => deleteRecord("classes", c.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-title">{c.name}</div>
                      <div className="item-sub">Batch: {batch?.name || "Unassigned"}</div>
                      {dept && <div className="item-sub">Dept: {dept.name}</div>}
                    </div>
                  )})}
                </div>
              )}
            </div>
          )})()}

          {/* SUBJECTS TAB */}
          {subTab === "subjects" && (() => {
            const filtered = subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code?.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
            <div className="coord-card">
              <h3>{editingId ? "Edit Subject" : "Create Subject"}</h3>
              <div className="form-row">
                <div className="form-group"><label>Department *</label><select value={subjDeptId} onChange={e => setSubjDeptId(e.target.value)}><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="form-group"><label>Semester</label><select value={subjSemId} onChange={e => setSubjSemId(e.target.value)}><option value="">Select Semester</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="form-group"><label>Subject Code</label><input placeholder="CS501" value={subjCode} onChange={e => setSubjCode(e.target.value)} /></div>
                <div className="form-group"><label>Subject Name *</label><input placeholder="Database Management Systems" value={subjName} onChange={e => setSubjName(e.target.value)} /></div>
                <div className="form-group"><label>Credits</label><input type="number" step="0.5" value={subjCredits} onChange={e => setSubjCredits(e.target.value)} /></div>
              </div>
              <div>
                <button className="primary-btn" disabled={formLoading} onClick={saveSubject}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update" : "Create"} Subject</button>
                {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              </div>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No subjects found.</div> : (
                <div className="grid-list">
                  {filtered.map(s => {
                    const dept = departments.find(d => d.id === s.department_id);
                    const sem = semesters.find(sem => sem.id === s.semester_id);
                    return (
                    <div className={`item-card ${s.is_active === false ? "inactive" : ""}`} key={s.id}>
                      <div className="actions">
                        <button className="icon-btn" title="Edit" onClick={() => handleEdit("subjects", s)}><Edit size={14} /></button>
                        <button className="icon-btn" title={s.is_active === false ? "Activate" : "Deactivate"} onClick={() => toggleStatus("subjects", s.id, s.is_active !== false)}>{s.is_active === false ? <Power size={14} /> : <PowerOff size={14} />}</button>
                        <button className="icon-btn delete" title="Delete" onClick={() => deleteRecord("subjects", s.id)}><Trash2 size={14} /></button>
                      </div>
                      <div className="item-title">{s.code ? `${s.code} - ` : ""}{s.name}</div>
                      <div className="item-sub">Dept: {dept?.name || "Unknown"} | Sem: {sem?.name || "N/A"}</div>
                      <div className="item-sub">Credits: {s.credits || 4}</div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )})()}

          {/* TEACHER ASSIGNMENT / SUBJECT OFFERINGS */}
          {subTab === "assignments" && (() => {
            const filtered = subjectOfferings.filter(so => {
              const s = subjects.find(subj => subj.id === so.subject_id);
              const c = classes.find(cls => cls.id === so.class_id);
              const t = teachers.find(tch => tch.id === so.teacher_id);
              const search = searchQuery.toLowerCase();
              return s?.name.toLowerCase().includes(search) || c?.name.toLowerCase().includes(search) || t?.full_name?.toLowerCase().includes(search);
            });
            return (
            <div className="coord-card">
              <h3>Create Subject Offering (Teacher Assignment)</h3>
              <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "16px" }}>Formula: CLASS + SUBJECT + TEACHER = SUBJECT OFFERING</p>
              <div className="form-row">
                <div className="form-group"><label>Subject *</label><select value={assignSubjId} onChange={e => setAssignSubjId(e.target.value)}><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}</select></div>
                <div className="form-group"><label>Class *</label><select value={assignClassId} onChange={e => setAssignClassId(e.target.value)}><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="form-group"><label>Teacher *</label><select value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)}><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}</select></div>
                <div className="form-group"><label>Academic Year</label><select value={assignYearId} onChange={e => setAssignYearId(e.target.value)}><option value="">Select Year</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></div>
                <div className="form-group"><label>Semester</label><select value={assignSemId} onChange={e => setAssignSemId(e.target.value)}><option value="">Select Semester</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              </div>
              <button className="primary-btn" disabled={formLoading} onClick={saveSubjectOffering}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update Assignment" : "Assign Teacher"}</button>
              {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No assignments found.</div> : (
                <div className="grid-list">
                  {filtered.map(so => {
                    const s = subjects.find(subj => subj.id === so.subject_id);
                    const c = classes.find(cls => cls.id === so.class_id);
                    const t = teachers.find(tch => tch.id === so.teacher_id);
                    const sem = semesters.find(sem => sem.id === so.semester_id);
                    const yr = academicYears.find(y => y.id === so.academic_year_id);
                    return (
                      <div className={`item-card ${so.is_active === false ? "inactive" : ""}`} key={so.id}>
                        <div className="actions">
                          <button className="icon-btn" title="Edit" onClick={() => handleEdit("subject_offerings", so)}><Edit size={14} /></button>
                          <button className="icon-btn" title={so.is_active === false ? "Activate" : "Deactivate"} onClick={() => toggleStatus("subject_offerings", so.id, so.is_active !== false)}>{so.is_active === false ? <Power size={14} /> : <PowerOff size={14} />}</button>
                          <button className="icon-btn delete" onClick={() => deleteRecord("subject_offerings", so.id)}><Trash2 size={14} /></button>
                        </div>
                        <div className="item-title">{s?.name || "Subject"} ({c?.name || "Class"})</div>
                        <div className="item-sub">👨‍🏫 Teacher: {t?.full_name || t?.email || "Unassigned"}</div>
                        <div className="item-sub">📅 {sem?.name || "N/A"} | {yr?.name || "N/A"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )})()}

                    {/* STUDENT ROSTER TAB */}
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

          {/* STUDENT ENROLLMENTS TAB */}
          {subTab === "students" && (() => {
            const filtered = enrollments.filter(en => {
              const st = rosterStudents.find(s => s.id === en.legacy_student_id);
              const c = classes.find(cls => cls.id === en.class_id);
              const search = searchQuery.toLowerCase();
              return st?.name?.toLowerCase().includes(search) || c?.name.toLowerCase().includes(search) || en.roll_number?.toLowerCase().includes(search);
            });
            return (
            <div className="coord-card">
              <h3>Enroll Student into Class</h3>
              <div className="form-row">
                <div className="form-group"><label>Student *</label><select value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)}><option value="">Select Student</option>{rosterStudents.map(st => <option key={st.id} value={st.id}>{st.name} ({st.student_id})</option>)}</select></div>
                <div className="form-group"><label>Class *</label><select value={enrollClassId} onChange={e => setEnrollClassId(e.target.value)}><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="form-group"><label>Roll Number / Code</label><input placeholder="e.g. BCS-01" value={enrollRoll} onChange={e => setEnrollRoll(e.target.value)} /></div>
              </div>
              <button className="primary-btn" disabled={formLoading} onClick={enrollStudent}><Plus size={16} /> Enroll Student</button>
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No enrollments found.</div> : (
                <div className="grid-list">
                  {filtered.map(en => {
                    const st = rosterStudents.find(s => s.id === en.legacy_student_id);
                    const c = classes.find(cls => cls.id === en.class_id);
                    return (
                      <div className="item-card" key={en.id}>
                        <div className="actions"><button className="icon-btn delete" onClick={() => deleteRecord("class_enrollments", en.id)}><Trash2 size={14} /></button></div>
                        <div className="item-title">{st?.name || "Unknown Student"}</div>
                        <div className="item-sub">Class: {c?.name} | Roll: {en.roll_number || "N/A"} | ID: {st?.student_id || "N/A"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )})()}

          {/* ROUTINES TAB */}
          {subTab === "routines" && (() => {
            const filtered = routines.filter(r => {
              const c = classes.find(cls => cls.id === r.class_id);
              const search = searchQuery.toLowerCase();
              return r.day_of_week.toLowerCase().includes(search) || c?.name.toLowerCase().includes(search) || r.room?.toLowerCase().includes(search);
            });
            return (
            <div className="coord-card">
              <h3>Manage Class Routines</h3>
              <div className="form-row">
                <div className="form-group"><label>Class *</label><select value={routClassId} onChange={e => setRoutClassId(e.target.value)}><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="form-group">
                  <label>Subject Offering *</label>
                  <select value={routOfferingId} onChange={e => setRoutOfferingId(e.target.value)}>
                    <option value="">Select Offering</option>
                    {subjectOfferings.filter(so => !routClassId || so.class_id === routClassId).map(so => {
                      const s = subjects.find(subj => subj.id === so.subject_id);
                      return <option key={so.id} value={so.id}>{s?.name}</option>;
                    })}
                  </select>
                </div>
                <div className="form-group"><label>Teacher *</label><select value={routTeacherId} onChange={e => setRoutTeacherId(e.target.value)}><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}</select></div>
                <div className="form-group"><label>Day *</label><select value={routDay} onChange={e => setRoutDay(e.target.value)}><option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option></select></div>
                <div className="form-group"><label>Start Time *</label><input type="time" value={routStart} onChange={e => setRoutStart(e.target.value)} /></div>
                <div className="form-group"><label>End Time *</label><input type="time" value={routEnd} onChange={e => setRoutEnd(e.target.value)} /></div>
                <div className="form-group"><label>Room</label><input value={routRoom} onChange={e => setRoutRoom(e.target.value)} placeholder="Room 204" /></div>
              </div>
              <button className="primary-btn" disabled={formLoading} onClick={saveRoutineEntry}>{editingId ? <CheckCircle size={16}/> : <Plus size={16} />} {editingId ? "Update Routine" : "Add Routine"}</button>
              {editingId && <button className="secondary-btn" onClick={resetForms}>Cancel</button>}
              <div style={{ marginTop: "24px" }}>{renderFilter()}</div>
              {filtered.length === 0 ? <div className="empty-state">No routines found.</div> : (
                <div className="grid-list">
                  {filtered.map(r => {
                    const c = classes.find(cls => cls.id === r.class_id);
                    const t = teachers.find(tch => tch.id === r.teacher_id);
                    const offering = subjectOfferings.find(so => so.id === r.subject_offering_id);
                    const s = subjects.find(subj => subj.id === offering?.subject_id);
                    return (
                      <div className="item-card" key={r.id}>
                        <div className="actions">
                          <button className="icon-btn" title="Edit" onClick={() => handleEdit("routines", r)}><Edit size={14} /></button>
                          <button className="icon-btn delete" onClick={() => deleteRecord("routines", r.id)}><Trash2 size={14} /></button>
                        </div>
                        <div className="item-title">{r.day_of_week} | {r.start_time} - {r.end_time}</div>
                        <div className="item-sub">📚 {s?.name} ({c?.name})</div>
                        <div className="item-sub">👨‍🏫 {t?.full_name || t?.email} | 🚪 {r.room || "N/A"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )})()}
        </>
      )}
    </div>
  );
}
