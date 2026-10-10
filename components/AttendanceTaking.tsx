"use client";

/**
 * AttendanceTaking.tsx
 * =====================
 * Complete attendance workflow for teachers:
 *  - Manual attendance with P/A toggle, mark all, search, review, save
 *  - OCR attendance via Gemini API with full review before saving
 *  - Duplicate session prevention, authorization check, correction support
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import {
  Upload, RefreshCw, Save, CheckCircle, XCircle, AlertTriangle,
  Eye, EyeOff, Search, UserCheck, UserX, Camera, ClipboardList,
  Calendar, ChevronDown, ChevronUp, Pencil, Info,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AttendanceStatus = "P" | "A";

type EnrolledStudent = {
  enrollment_id: string;
  student_id: string;       // UUID in students table
  name: string;
  roll_number: string | null;
  student_code: string;     // student_id text (e.g. "101100")
  attendance_code: string | null; // explicit 4-digit code
};

type AttendanceRow = {
  student: EnrolledStudent;
  status: AttendanceStatus;
  detectedByOCR: boolean;
  modified: boolean;        // manually changed after OCR
};

type SavedSession = {
  id: string;
  attendance_date: string;
  created_at: string;
  source_file_name: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function effectiveCode(s: EnrolledStudent): string {
  // Prefer explicit attendance_code, fall back to last 4 digits of student_code
  if (s.attendance_code && /^\d{4}$/.test(s.attendance_code)) {
    return s.attendance_code;
  }
  const digits = s.student_code.replace(/\D/g, "");
  return digits.slice(-4) || s.attendance_code || "";
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AttendanceTaking({
  offeringId,
  classId,
  userProfile,
  subjectName,
  className,
  onClose,
}: {
  offeringId: string;
  classId: string;
  userProfile: UserProfile;
  subjectName: string;
  className: string;
  onClose?: () => void;
}) {
  // ── State ──────────────────────────────────────────────────────────────────

  const [mode, setMode] = useState<"manual" | "ocr">("manual");
  const [date, setDate] = useState(todayLocal());
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [search, setSearch] = useState("");
  const [reviewed, setReviewed] = useState(false);

  // Existing session for this offering+date (if any)
  const [existingSession, setExistingSession] = useState<SavedSession | null>(null);
  const [pastSessions, setPastSessions] = useState<SavedSession[]>([]);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [sessionRecords, setSessionRecords] = useState<any[]>([]);

  // Loading/status flags
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);

  // OCR-specific
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [detectedCodes, setDetectedCodes] = useState<string[]>([]);
  const [unmatchedCodes, setUnmatchedCodes] = useState<string[]>([]);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authorization
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // History toggle
  const [showHistory, setShowHistory] = useState(false);

  // ── Authorization check ────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAuth() {
      if (userProfile.role === "super_admin" || userProfile.role === "coordinator") {
        setAuthorized(true);
        return;
      }
      const { data } = await supabase
        .from("subject_offerings")
        .select("teacher_id")
        .eq("id", offeringId)
        .single();
      setAuthorized(data?.teacher_id === userProfile.id);
    }
    checkAuth();
  }, [offeringId, userProfile.id, userProfile.role]);

  // ── Load enrolled students ─────────────────────────────────────────────────

  const loadEnrolledStudents = useCallback(async () => {
    setLoadingStudents(true);
    const { data, error } = await supabase
      .from("class_enrollments")
      .select(`
        id,
        roll_number,
        legacy_student_id,
        students (
          id,
          name,
          student_id,
          attendance_code,
          is_active
        )
      `)
      .eq("class_id", classId);

    if (error) {
      flash("err", "Failed to load students: " + error.message);
      setLoadingStudents(false);
      return;
    }

    const list: EnrolledStudent[] = (data || [])
      .filter((e: any) => e.students?.is_active !== false)
      .map((e: any) => ({
        enrollment_id: e.id,
        student_id: e.students?.id || e.legacy_student_id,
        name: e.students?.name || "Unknown Student",
        roll_number: e.roll_number,
        student_code: e.students?.student_id || "",
        attendance_code: e.students?.attendance_code || null,
      }));

    // Sort by roll_number then name
    list.sort((a, b) => {
      if (a.roll_number && b.roll_number) return a.roll_number.localeCompare(b.roll_number);
      return a.name.localeCompare(b.name);
    });

    setEnrolledStudents(list);
    setLoadingStudents(false);
  }, [classId]);

  useEffect(() => {
    loadEnrolledStudents();
  }, [loadEnrolledStudents]);

  // ── Build initial rows whenever students or mode changes ───────────────────

  useEffect(() => {
    if (!enrolledStudents.length) return;
    setRows(
      enrolledStudents.map((s) => ({
        student: s,
        status: "P",
        detectedByOCR: false,
        modified: false,
      }))
    );
    setReviewed(false);
    setOcrDone(false);
    setDetectedCodes([]);
    setUnmatchedCodes([]);
    setOcrText("");
  }, [enrolledStudents, mode]);

  // ── Check existing session when date or offeringId changes ────────────────

  useEffect(() => {
    async function checkExistingSession() {
      if (!offeringId || !date) return;

      const { data } = await supabase
        .from("attendance_sessions")
        .select("id, attendance_date, created_at, source_file_name")
        .eq("subject_offering_id", offeringId)
        .eq("attendance_date", date)
        .maybeSingle();

      setExistingSession(data || null);

      if (data) {
        // Load records for this session to pre-fill rows
        await loadSessionRecordsIntoRows(data.id);
      } else {
        // Reset rows to all-present defaults
        setRows((prev) =>
          prev.map((r) => ({ ...r, status: "P", detectedByOCR: false, modified: false }))
        );
        setReviewed(false);
      }
    }
    checkExistingSession();
  }, [offeringId, date]);

  // ── Load past sessions for history ────────────────────────────────────────

  useEffect(() => {
    async function loadPastSessions() {
      const { data } = await supabase
        .from("attendance_sessions")
        .select("id, attendance_date, created_at, source_file_name")
        .eq("subject_offering_id", offeringId)
        .order("attendance_date", { ascending: false });
      setPastSessions(data || []);
    }
    loadPastSessions();
  }, [offeringId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function flash(type: "ok" | "err" | "info", text: string) {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 6000);
  }

  async function loadSessionRecordsIntoRows(sessionId: string) {
    const { data: records } = await supabase
      .from("attendance_records")
      .select("student_id, status, detected_code, updated_at")
      .eq("session_id", sessionId);

    if (!records) return;

    const statusMap: Record<string, AttendanceStatus> = {};
    records.forEach((r: any) => {
      statusMap[r.student_id] = r.status as AttendanceStatus;
    });

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        status: statusMap[row.student.student_id] ?? row.status,
        modified: false,
      }))
    );
    setReviewed(true);
  }

  async function loadSessionDetails(sessionId: string) {
    setViewingSessionId(sessionId);
    const { data } = await supabase
      .from("attendance_records")
      .select("student_id, status, detected_code, updated_at, students(name, student_id)")
      .eq("session_id", sessionId);
    setSessionRecords(data || []);
  }

  // ── Manual toggle ──────────────────────────────────────────────────────────

  function toggleStatus(studentId: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.student.student_id === studentId
          ? { ...r, status: r.status === "P" ? "A" : "P", modified: true }
          : r
      )
    );
    setReviewed(false);
  }

  function markAll(status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => ({ ...r, status, modified: true })));
    setReviewed(false);
  }

  // ── OCR processing ─────────────────────────────────────────────────────────

  function extractAndNormalizeCodes(text: string): string[] {
    const normalized = text
      .replace(/[Oo]/g, "0")
      .replace(/[IiLl]/g, "1")
      .replace(/[Zz]/g, "2")
      .replace(/[Ss]/g, "5")
      .replace(/[Gg]/g, "6")
      .replace(/[Bb]/g, "8");
    const matches = normalized.match(/\b\d{4}\b/g) || [];
    return Array.from(
      new Set(
        matches
          .filter((c) => {
            const v = Number(c);
            return !(v >= 1900 && v <= 2100);
          })
      )
    );
  }

  async function processOCR() {
    if (!ocrFile) {
      flash("err", "Please select an attendance photo first.");
      return;
    }
    if (!enrolledStudents.length) {
      flash("err", "No enrolled students found for this class.");
      return;
    }

    // File size validation (max 10MB)
    if (ocrFile.size > 10 * 1024 * 1024) {
      flash("err", "Image file is too large. Maximum allowed size is 10MB.");
      return;
    }

    // Type validation
    if (!ocrFile.type.startsWith("image/")) {
      flash("err", "Please upload a valid image file (JPEG, PNG, etc.).");
      return;
    }

    setOcrProcessing(true);
    setOcrDone(false);
    setDetectedCodes([]);
    setUnmatchedCodes([]);

    try {
      const formData = new FormData();
      formData.append("image", ocrFile);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      let response: Response;
      try {
        response = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr?.name === "AbortError") {
          flash("err", "OCR request timed out. Please try again with a clearer image.");
        } else {
          flash("err", "Network error communicating with OCR service.");
        }
        setOcrProcessing(false);
        return;
      } finally {
        clearTimeout(timeout);
      }

      const json = await response.json();

      if (!response.ok) {
        if (response.status === 500 && json.error?.includes("GEMINI_API_KEY")) {
          flash("err", "OCR service not configured. Ask your administrator to set GEMINI_API_KEY.");
        } else {
          flash("err", json.error || "OCR API request failed.");
        }
        setOcrProcessing(false);
        return;
      }

      const rawText: string = json.raw ?? "";
      setOcrText(rawText);

      // Merge API codes with local normalization as fallback
      const apiCodes: string[] = (json.codes ?? []).filter(
        (c: string) => /^\d{4}$/.test(c)
      );
      const localCodes = extractAndNormalizeCodes(rawText);
      const allRawCodes = Array.from(new Set([...apiCodes, ...localCodes]));

      // Build a code→student map for this class
      const codeMap: Record<string, EnrolledStudent> = {};
      enrolledStudents.forEach((s) => {
        const code = effectiveCode(s);
        if (code) codeMap[code] = s;
      });

      const matched: Set<string> = new Set(); // student_ids matched
      const detectedList: string[] = [];
      const unmatchedList: string[] = [];

      allRawCodes.forEach((code) => {
        if (codeMap[code]) {
          detectedList.push(code);
          matched.add(codeMap[code].student_id);
        } else {
          unmatchedList.push(code);
        }
      });

      setDetectedCodes(detectedList);
      setUnmatchedCodes(unmatchedList);

      // Update rows: matched → Present, others → Absent (for review)
      setRows(
        enrolledStudents.map((s) => ({
          student: s,
          status: matched.has(s.student_id) ? "P" : "A",
          detectedByOCR: matched.has(s.student_id),
          modified: false,
        }))
      );

      setOcrDone(true);
      setReviewed(false);
      flash(
        "info",
        `OCR complete. ${detectedList.length} codes matched. Review carefully before saving.`
      );
    } catch (err) {
      console.error("OCR error:", err);
      flash("err", err instanceof Error ? err.message : "OCR processing failed.");
    } finally {
      setOcrProcessing(false);
    }
  }

  // ── Save attendance ────────────────────────────────────────────────────────

  async function saveAttendance() {
    if (!reviewed) {
      flash("err", "Please check the 'I have reviewed attendance' box before saving.");
      return;
    }
    if (!rows.length) {
      flash("err", "No student attendance data to save.");
      return;
    }

    setSavingAttendance(true);

    try {
      let sessionId: string;

      if (existingSession) {
        // Re-saving: delete old records, update session
        sessionId = existingSession.id;

        const { error: delErr } = await supabase
          .from("attendance_records")
          .delete()
          .eq("session_id", sessionId);
        if (delErr) throw new Error("Failed to clear old records: " + delErr.message);

        await supabase
          .from("attendance_sessions")
          .update({
            source_file_name: ocrFile?.name ?? existingSession.source_file_name,
          })
          .eq("id", sessionId);
      } else {
        // Create new session
        const { data: newSession, error: sessErr } = await supabase
          .from("attendance_sessions")
          .insert({
            user_id: userProfile.id,
            attendance_date: date,
            subject_offering_id: offeringId,
            class_id: classId,
            source_file_name: ocrFile?.name ?? null,
            created_by: userProfile.id,
          })
          .select("id")
          .single();

        if (sessErr || !newSession) {
          // Handle unique constraint violation
          if (sessErr?.code === "23505") {
            flash("err", `A session already exists for ${date}. Please refresh and edit the existing session.`);
            return;
          }
          throw new Error(sessErr?.message || "Failed to create session.");
        }
        sessionId = newSession.id;
      }

      // Insert all records in one batch
      const records = rows.map((row) => ({
        user_id: userProfile.id,
        session_id: sessionId,
        student_id: row.student.student_id,
        status: row.status,
        detected_code: row.detectedByOCR && !row.modified ? effectiveCode(row.student) : null,
        updated_at: new Date().toISOString(),
        updated_by: userProfile.id,
      }));

      const { error: recErr } = await supabase.from("attendance_records").insert(records);

      if (recErr) {
        if (recErr.code === "23505") {
          flash("err", "Duplicate record detected. This session may have been saved already.");
        } else {
          throw new Error("Failed to save records: " + recErr.message);
        }
        return;
      }

      flash("ok", `Attendance saved! ${rows.filter((r) => r.status === "P").length} present, ${rows.filter((r) => r.status === "A").length} absent.`);

      // Refresh state
      setExistingSession({
        id: sessionId,
        attendance_date: date,
        created_at: new Date().toISOString(),
        source_file_name: ocrFile?.name ?? null,
      });

      // Refresh past sessions list
      const { data: updated } = await supabase
        .from("attendance_sessions")
        .select("id, attendance_date, created_at, source_file_name")
        .eq("subject_offering_id", offeringId)
        .order("attendance_date", { ascending: false });
      setPastSessions(updated || []);
    } catch (err) {
      console.error("Save error:", err);
      flash("err", err instanceof Error ? err.message : "Failed to save attendance.");
    } finally {
      setSavingAttendance(false);
    }
  }

  // ── Filtered rows ──────────────────────────────────────────────────────────

  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.student.name.toLowerCase().includes(q) ||
      (r.student.roll_number?.toLowerCase().includes(q) ?? false) ||
      r.student.student_code.toLowerCase().includes(q) ||
      (r.student.attendance_code?.includes(q) ?? false)
    );
  });

  const presentCount = rows.filter((r) => r.status === "P").length;
  const absentCount = rows.filter((r) => r.status === "A").length;
  const percentage =
    rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 0;

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (authorized === null) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Checking authorization…</div>;
  }
  if (!authorized) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>
        <AlertTriangle size={36} style={{ marginBottom: 12 }} />
        <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>Access Denied</div>
        <p>You are not the assigned teacher for this subject offering.</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="at-container">
      <style>{`
        .at-container { display: flex; flex-direction: column; gap: 20px; }
        .at-header {
          background: linear-gradient(135deg, #450c3f 0%, #2b0728 100%);
          color: white;
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .at-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .at-mode-tabs {
          display: flex;
          gap: 0;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          width: fit-content;
        }
        .at-mode-tab {
          padding: 9px 20px;
          border: none;
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          transition: all 0.15s;
        }
        .at-mode-tab.active {
          background: #450c3f;
          color: white;
        }
        .at-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .at-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }
        .at-btn-primary { background: #450c3f; color: white; }
        .at-btn-primary:hover:not(:disabled) { background: #2b0728; }
        .at-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .at-btn-success { background: #059669; color: white; }
        .at-btn-success:hover:not(:disabled) { background: #047857; }
        .at-btn-success:disabled { opacity: 0.5; cursor: not-allowed; }
        .at-btn-danger { background: #dc2626; color: white; }
        .at-btn-danger:hover { background: #b91c1c; }
        .at-btn-outline {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        .at-btn-outline:hover { background: #f9fafb; }
        .at-search {
          padding: 8px 14px 8px 36px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          width: 240px;
          outline: none;
        }
        .at-search:focus { border-color: #450c3f; box-shadow: 0 0 0 2px rgba(69,12,63,0.1); }
        .at-search-wrap { position: relative; }
        .at-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .at-table { width: 100%; border-collapse: collapse; }
        .at-table th {
          padding: 10px 12px;
          text-align: left;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
        }
        .at-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
          vertical-align: middle;
        }
        .at-table tr:hover td { background: #f9fafb; }
        .status-toggle {
          padding: 5px 14px;
          border-radius: 20px;
          border: 2px solid transparent;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          min-width: 80px;
          transition: all 0.15s;
        }
        .status-toggle.present {
          background: #dcfce7;
          color: #15803d;
          border-color: #86efac;
        }
        .status-toggle.present:hover { background: #bbf7d0; }
        .status-toggle.absent {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fca5a5;
        }
        .status-toggle.absent:hover { background: #fecaca; }
        .ocr-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 6px;
          font-weight: 600;
        }
        .ocr-badge.matched { background: #dcfce7; color: #15803d; }
        .ocr-badge.modified { background: #fef9c3; color: #92400e; }
        .pill-box {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .code-pill {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .code-pill.unmatched { background: #fee2e2; border-color: #fca5a5; color: #b91c1c; }
        .summary-bar {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
          font-size: 0.875rem;
        }
        .summary-pill {
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 700;
        }
        .summary-pill.present { background: #dcfce7; color: #15803d; }
        .summary-pill.absent { background: #fee2e2; color: #dc2626; }
        .at-flash {
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .at-flash.ok { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .at-flash.err { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
        .at-flash.info { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
        .existing-banner {
          background: #fef9c3;
          border: 1px solid #fde047;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 0.875rem;
          color: #92400e;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .review-checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          color: #374151;
        }
        .review-checkbox-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #450c3f;
        }
        .history-session-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .history-session-row:last-child { border-bottom: none; }
        .ocr-upload-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #f3f4f6;
          border: 2px dashed #d1d5db;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          color: #374151;
          transition: all 0.15s;
        }
        .ocr-upload-label:hover { background: #e5e7eb; border-color: #9ca3af; }
        .date-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
        }
      `}</style>

      {/* Header */}
      <div className="at-header">
        <div>
          <div style={{ fontSize: "0.8rem", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>
            Attendance Worksheet
          </div>
          <h2 style={{ margin: "4px 0", fontSize: "1.4rem" }}>{subjectName}</h2>
          <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>Class: {className} · {enrolledStudents.length} enrolled students</div>
        </div>
        <div className="at-mode-tabs">
          <button
            className={`at-mode-tab ${mode === "manual" ? "active" : ""}`}
            onClick={() => { setMode("manual"); setOcrDone(false); }}
          >
            <ClipboardList size={15} /> Manual
          </button>
          <button
            className={`at-mode-tab ${mode === "ocr" ? "active" : ""}`}
            onClick={() => setMode("ocr")}
          >
            <Camera size={15} /> OCR Photo
          </button>
        </div>
      </div>

      {/* Status flash */}
      {statusMsg && (
        <div className={`at-flash ${statusMsg.type}`}>
          {statusMsg.type === "ok" && <CheckCircle size={18} />}
          {statusMsg.type === "err" && <XCircle size={18} />}
          {statusMsg.type === "info" && <Info size={18} />}
          {statusMsg.text}
        </div>
      )}

      {/* Date picker + existing session warning */}
      <div className="at-card">
        <div className="at-controls">
          <div>
            <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 4, color: "#374151" }}>
              Session Date
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={16} color="#450c3f" />
              <input
                type="date"
                className="date-input"
                value={date}
                onChange={(e) => { setDate(e.target.value); setReviewed(false); }}
              />
            </div>
          </div>
        </div>
        {existingSession && (
          <div className="existing-banner" style={{ marginTop: 12 }}>
            <AlertTriangle size={16} />
            Attendance already recorded for {date}. Saving again will <strong>replace</strong> all existing records for this date.
          </div>
        )}
      </div>

      {/* OCR Panel (only in OCR mode) */}
      {mode === "ocr" && (
        <div className="at-card">
          <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 14, color: "#111827" }}>
            <Camera size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Upload Attendance Photo
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
            <label className="ocr-upload-label">
              <Upload size={16} />
              {ocrFile ? ocrFile.name : "Choose Photo (JPEG / PNG, max 10MB)"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setOcrFile(f);
                  setOcrDone(false);
                  setDetectedCodes([]);
                  setUnmatchedCodes([]);
                }}
              />
            </label>

            <button
              className="at-btn at-btn-primary"
              onClick={processOCR}
              disabled={ocrProcessing || !ocrFile}
            >
              {ocrProcessing ? (
                <><RefreshCw size={15} className="spin" /> Reading codes…</>
              ) : (
                <><Camera size={15} /> Extract Codes</>
              )}
            </button>
          </div>

          {ocrDone && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151", marginBottom: 6 }}>
                ✅ Matched codes ({detectedCodes.length}):
              </div>
              {detectedCodes.length > 0 ? (
                <div className="pill-box">
                  {detectedCodes.map((c) => (
                    <span key={c} className="code-pill">{c}</span>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No codes matched students in this class.</p>
              )}

              {unmatchedCodes.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#b91c1c", marginBottom: 6, marginTop: 14 }}>
                    ⚠️ Unrecognized codes not assigned to any student ({unmatchedCodes.length}):
                  </div>
                  <div className="pill-box">
                    {unmatchedCodes.map((c) => (
                      <span key={c} className="code-pill unmatched">{c}</span>
                    ))}
                  </div>
                </>
              )}

              {ocrText && (
                <details style={{ marginTop: 14 }}>
                  <summary style={{ cursor: "pointer", fontSize: "0.8rem", color: "#6b7280" }}>
                    Raw OCR text (debug)
                  </summary>
                  <pre style={{ fontSize: "0.75rem", color: "#374151", background: "#f9fafb", padding: 10, borderRadius: 6, whiteSpace: "pre-wrap", marginTop: 6 }}>
                    {ocrText || "No raw text returned."}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attendance Table */}
      <div className="at-card">
        {loadingStudents ? (
          <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>
            <RefreshCw size={24} className="spin" />
            <div style={{ marginTop: 8 }}>Loading enrolled students…</div>
          </div>
        ) : enrolledStudents.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            <UserX size={36} style={{ marginBottom: 10, color: "#d1d5db" }} />
            <div style={{ fontWeight: 600 }}>No students enrolled in this class.</div>
            <p style={{ fontSize: "0.85rem" }}>Ask the Coordinator to enroll students before taking attendance.</p>
          </div>
        ) : (
          <>
            {/* Controls bar */}
            <div className="at-controls" style={{ marginBottom: 16 }}>
              <div className="at-search-wrap">
                <Search size={14} className="at-search-icon" />
                <input
                  className="at-search"
                  placeholder="Search by name / roll / ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="at-btn at-btn-success" onClick={() => markAll("P")}>
                <UserCheck size={14} /> All Present
              </button>
              <button className="at-btn at-btn-danger" onClick={() => markAll("A")}>
                <UserX size={14} /> All Absent
              </button>
            </div>

            {/* Summary bar */}
            <div className="summary-bar" style={{ marginBottom: 14 }}>
              <span className="summary-pill present">✓ Present: {presentCount}</span>
              <span className="summary-pill absent">✗ Absent: {absentCount}</span>
              <span style={{ fontWeight: 600, color: "#374151" }}>Total: {rows.length}</span>
              <span style={{ fontWeight: 700, color: percentage >= 75 ? "#059669" : "#dc2626" }}>
                {percentage}% attendance rate
              </span>
              {mode === "ocr" && ocrDone && (
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  — Review and correct OCR results before saving
                </span>
              )}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="at-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll</th>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>ATT Code</th>
                    {mode === "ocr" && <th>OCR Detection</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr key={row.student.student_id}>
                      <td style={{ color: "#9ca3af", fontWeight: 500 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.student.roll_number || "—"}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{row.student.name}</span>
                        {mode === "ocr" && row.detectedByOCR && !row.modified && (
                          <span className="ocr-badge matched">OCR</span>
                        )}
                        {mode === "ocr" && row.modified && (
                          <span className="ocr-badge modified">Edited</span>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>
                        {row.student.student_code}
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                          {effectiveCode(row.student) || "—"}
                        </span>
                      </td>
                      {mode === "ocr" && (
                        <td>
                          {row.detectedByOCR ? (
                            <span style={{ color: "#15803d", fontWeight: 600 }}>✓ Found</span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>Not found</span>
                          )}
                        </td>
                      )}
                      <td>
                        <button
                          className={`status-toggle ${row.status === "P" ? "present" : "absent"}`}
                          onClick={() => toggleStatus(row.student.student_id)}
                        >
                          {row.status === "P" ? "PRESENT" : "ABSENT"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
                  No students match your search.
                </div>
              )}
            </div>

            {/* Review + Save */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
              <label className="review-checkbox-row">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I have reviewed the attendance above and confirm it is correct.
              </label>

              <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  className="at-btn at-btn-primary"
                  onClick={saveAttendance}
                  disabled={savingAttendance || !reviewed}
                  style={{ fontSize: "1rem", padding: "10px 24px" }}
                >
                  {savingAttendance ? (
                    <><RefreshCw size={16} className="spin" /> Saving…</>
                  ) : existingSession ? (
                    <><Pencil size={16} /> Update Attendance</>
                  ) : (
                    <><Save size={16} /> Save Attendance</>
                  )}
                </button>

                {existingSession && (
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle size={14} color="#059669" />
                    Last saved session found for {existingSession.attendance_date}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Past Sessions History */}
      <div className="at-card">
        <button
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "1rem", color: "#111827", padding: 0 }}
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          Session History ({pastSessions.length} sessions)
        </button>

        {showHistory && (
          <div style={{ marginTop: 14 }}>
            {pastSessions.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No sessions recorded yet.</div>
            ) : (
              pastSessions.map((sess) => (
                <div key={sess.id} className="history-session-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>{sess.attendance_date}</div>
                    <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      {sess.source_file_name ? `📷 ${sess.source_file_name}` : "Manual entry"}
                    </div>
                  </div>
                  <button
                    className="at-btn at-btn-outline"
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    onClick={() => {
                      setDate(sess.attendance_date);
                      setShowHistory(false);
                    }}
                  >
                    <Eye size={13} /> Load
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
