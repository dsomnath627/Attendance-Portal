"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import {
  BookOpen,
  CalendarCheck,
  FileText,
  ClipboardList,
  HelpCircle,
  BarChart3,
  Clock,
  ArrowLeft,
  Users,
  User,
  Plus,
  Calendar,
  CheckCircle,
} from "lucide-react";

type SubjectOfferingDetails = {
  id: string;
  subject_name: string;
  subject_code: string;
  credits: number;
  class_name: string;
  teacher_name: string;
  semester_name: string;
  academic_year: string;
};

type RoutineItem = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
};

type AttendanceRecord = {
  id: string;
  attendance_date: string;
  status: string;
};

export default function SubjectPage({
  offeringId,
  userProfile,
  onBack,
}: {
  offeringId: string;
  userProfile: UserProfile;
  onBack?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "attendance" | "notes" | "assignments" | "quizzes" | "marks" | "routine"
  >("overview");

  const [details, setDetails] = useState<SubjectOfferingDetails | null>(null);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [enrolledCount, setEnrolledCount] = useState<number>(0);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSubjectData() {
    setLoading(true);
    try {
      // 1. Load subject offering join details
      const { data: offering, error } = await supabase
        .from("subject_offerings")
        .select(`
          id,
          subjects (name, code, credits),
          classes (id, name),
          profiles (full_name, email),
          semesters (name),
          academic_years (name)
        `)
        .eq("id", offeringId)
        .single();

      if (offering) {
        const obj = offering as any;
        setDetails({
          id: obj.id,
          subject_name: obj.subjects?.name || "Subject",
          subject_code: obj.subjects?.code || "SUBJ",
          credits: obj.subjects?.credits || 4,
          class_name: obj.classes?.name || "Class",
          teacher_name: obj.profiles?.full_name || obj.profiles?.email || "Teacher",
          semester_name: obj.semesters?.name || "Semester",
          academic_year: obj.academic_years?.name || "Current Year",
        });

        // 2. Count enrollments for this class
        if (obj.classes?.id) {
          const { count } = await supabase
            .from("class_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", obj.classes.id);
          setEnrolledCount(count || 0);
        }
      }

      // 3. Load routines for this subject offering
      const { data: routData } = await supabase
        .from("routines")
        .select("*")
        .eq("subject_offering_id", offeringId);
      if (routData) setRoutines(routData as RoutineItem[]);

      // 4. Load attendance summary records
      const { data: attData } = await supabase
        .from("attendance_sessions")
        .select("id, attendance_date")
        .order("attendance_date", { ascending: false });
      if (attData) setAttendanceRecords(attData as any);
    } catch (err) {
      console.error("Error loading subject details:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSubjectData();
  }, [offeringId]);

  return (
    <div className="subject-page-container">
      <style>{`
        .subject-page-container { display: flex; flex-direction: column; gap: 20px; }
        .subject-header {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .header-title-box { display: flex; align-items: center; gap: 16px; }
        .back-btn {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          color: #374151;
        }
        .back-btn:hover { background: #e5e7eb; }
        .subject-code-badge {
          background: #3b82f6;
          color: #ffffff;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.85rem;
          display: inline-block;
          margin-bottom: 6px;
        }
        .subject-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #e5e7eb;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .subj-tab-btn {
          padding: 10px 18px;
          border: none;
          background: transparent;
          font-weight: 600;
          font-size: 0.875rem;
          color: #6b7280;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
        }
        .subj-tab-btn.active {
          color: #111827;
          border-bottom-color: #3b82f6;
        }
        .subject-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .empty-placeholder {
          text-align: center;
          padding: 50px 20px;
          color: #6b7280;
        }
        .empty-icon {
          width: 50px;
          height: 50px;
          margin: 0 auto 12px auto;
          color: #9ca3af;
        }
      `}</style>

      {/* HEADER */}
      <div className="subject-header">
        <div className="header-title-box">
          {onBack && (
            <button className="back-btn" onClick={onBack}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div>
            <span className="subject-code-badge">{details?.subject_code || "SUBJ"}</span>
            <h2 style={{ margin: 0, fontSize: "1.5rem", color: "#111827" }}>
              {details?.subject_name || "Subject Name"}
            </h2>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
              Class: <strong>{details?.class_name}</strong> | Teacher: <strong>{details?.teacher_name}</strong> | Credits: <strong>{details?.credits}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="subject-tabs">
        <button
          className={`subj-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BookOpen size={16} /> Overview
        </button>
        <button
          className={`subj-tab-btn ${activeTab === "attendance" ? "active" : ""}`}
          onClick={() => setActiveTab("attendance")}
        >
          <CalendarCheck size={16} /> Attendance
        </button>
        <button
          className={`subj-tab-btn ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          <FileText size={16} /> Notes
        </button>
        <button
          className={`subj-tab-btn ${activeTab === "assignments" ? "active" : ""}`}
          onClick={() => setActiveTab("assignments")}
        >
          <ClipboardList size={16} /> Assignments
        </button>
        <button
          className={`subj-tab-btn ${activeTab === "quizzes" ? "active" : ""}`}
          onClick={() => setActiveTab("quizzes")}
        >
          <HelpCircle size={16} /> Quizzes
        </button>
        <button
          className={`subj-tab-btn ${activeTab === "marks" ? "active" : ""}`}
          onClick={() => setActiveTab("marks")}
        >
          <BarChart3 size={16} /> Marks
        </button>
        <button
          className={`subj-tab-btn ${activeTab === "routine" ? "active" : ""}`}
          onClick={() => setActiveTab("routine")}
        >
          <Clock size={16} /> Routine
        </button>
      </div>

      {/* CONTENT CARD */}
      <div className="subject-card">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>Loading Subject Details...</div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div>
                <h3 style={{ marginTop: 0 }}>Subject Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "16px" }}>
                  <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Enrolled Students</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827" }}>{enrolledCount}</div>
                  </div>
                  <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Academic Year</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#111827" }}>{details?.academic_year}</div>
                  </div>
                  <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Semester</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#111827" }}>{details?.semester_name}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div>
                <h3>Attendance History</h3>
                {attendanceRecords.length === 0 ? (
                  <div className="empty-placeholder">
                    <CalendarCheck className="empty-icon" />
                    <p>No attendance sessions recorded yet for this subject offering.</p>
                  </div>
                ) : (
                  <ul style={{ paddingLeft: "20px" }}>
                    {attendanceRecords.map((r) => (
                      <li key={r.id} style={{ marginBottom: "8px" }}>
                        Session Date: <strong>{r.attendance_date}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "notes" && (
              <div className="empty-placeholder">
                <FileText className="empty-icon" />
                <h4>No Study Notes Posted Yet</h4>
                <p>Teacher has not uploaded notes or lecture materials for this subject.</p>
              </div>
            )}

            {activeTab === "assignments" && (
              <div className="empty-placeholder">
                <ClipboardList className="empty-icon" />
                <h4>No Pending Assignments</h4>
                <p>There are currently no active assignments assigned to this class.</p>
              </div>
            )}

            {activeTab === "quizzes" && (
              <div className="empty-placeholder">
                <HelpCircle className="empty-icon" />
                <h4>No Quizzes Scheduled</h4>
                <p>No upcoming quizzes or online tests scheduled for this subject.</p>
              </div>
            )}

            {activeTab === "marks" && (
              <div>
                <h3>Subject Assessment Marks</h3>
                <div className="empty-placeholder">
                  <BarChart3 className="empty-icon" />
                  <p>Assessment marks record for this subject offering.</p>
                </div>
              </div>
            )}

            {activeTab === "routine" && (
              <div>
                <h3>Weekly Schedule / Routine</h3>
                {routines.length === 0 ? (
                  <div className="empty-placeholder">
                    <Clock className="empty-icon" />
                    <p>No routine schedule entries configured for this subject yet.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px", marginTop: "16px" }}>
                    {routines.map((r) => (
                      <div key={r.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "14px" }}>
                        <div style={{ fontWeight: 700, color: "#111827" }}>{r.day_of_week}</div>
                        <div style={{ fontSize: "0.875rem", color: "#4b5563", marginTop: "4px" }}>
                          🕒 {r.start_time} - {r.end_time}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "2px" }}>
                          📍 {r.room || "Room N/A"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
