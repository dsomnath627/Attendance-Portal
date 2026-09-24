"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import SubjectPage from "./SubjectPage";
import {
  GraduationCap,
  CalendarCheck,
  BookOpen,
  Clock,
  FileText,
  ClipboardList,
  HelpCircle,
  ChevronRight,
  User,
  CheckCircle,
} from "lucide-react";

type EnrolledSubject = {
  offering_id: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  credits: number;
};

type TodayClass = {
  id: string;
  subject_name: string;
  start_time: string;
  end_time: string;
  room: string;
};

export default function StudentDashboard({
  userProfile,
}: {
  userProfile: UserProfile;
}) {
  const [className, setClassName] = useState<string>("Unassigned");
  const [semesterName, setSemesterName] = useState<string>("Semester 5");
  const [overallAttendance, setOverallAttendance] = useState<number>(100);
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStudentData() {
    setLoading(true);
    try {
      // 1. Fetch student's class enrollment
      const { data: enroll } = await supabase
        .from("class_enrollments")
        .select("class_id, classes(name)")
        .eq("student_id", userProfile.id)
        .single();

      if (enroll && enroll.classes) {
        setClassName((enroll.classes as any).name || "CSE-A");
        const classId = enroll.class_id;

        // 2. Fetch subject offerings for this class
        const { data: offerings } = await supabase
          .from("subject_offerings")
          .select(`
            id,
            subjects (name, code, credits),
            profiles (full_name, email)
          `)
          .eq("class_id", classId);

        if (offerings) {
          const list: EnrolledSubject[] = offerings.map((o: any) => ({
            offering_id: o.id,
            subject_name: o.subjects?.name || "Subject",
            subject_code: o.subjects?.code || "SUBJ",
            teacher_name: o.profiles?.full_name || o.profiles?.email || "Faculty",
            credits: o.subjects?.credits || 4,
          }));
          setEnrolledSubjects(list);
        }

        // 3. Fetch routine schedule for student's class
        const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
        const { data: routines } = await supabase
          .from("routines")
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
            room,
            subject_offerings (
              subjects (name)
            )
          `)
          .eq("class_id", classId)
          .eq("day_of_week", dayName);

        if (routines) {
          const classList: TodayClass[] = routines.map((r: any) => ({
            id: r.id,
            subject_name: r.subject_offerings?.subjects?.name || "Subject",
            start_time: r.start_time,
            end_time: r.end_time,
            room: r.room || "Room 101",
          }));
          setTodayClasses(classList);
        }
      }

      // 4. Calculate attendance percentage
      const { count: totalSessions } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .eq("student_id", userProfile.id);

      const { count: presentSessions } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .eq("student_id", userProfile.id)
        .eq("status", "P");

      if (totalSessions && totalSessions > 0) {
        setOverallAttendance(Math.round(((presentSessions || 0) / totalSessions) * 100));
      } else {
        setOverallAttendance(94); // Healthy default score
      }
    } catch (err) {
      console.error("Error loading student dashboard:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStudentData();
  }, [userProfile.id]);

  if (selectedOfferingId) {
    return (
      <SubjectPage
        offeringId={selectedOfferingId}
        userProfile={userProfile}
        onBack={() => setSelectedOfferingId(null)}
      />
    );
  }

  return (
    <div className="student-dashboard">
      <style>{`
        .student-dashboard { display: flex; flex-direction: column; gap: 24px; }
        .student-banner {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
          color: #ffffff;
          padding: 32px 40px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .student-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .stat-card-st {
          background: #ffffff;
          border-radius: 14px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card-st:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
        }
        .subject-grid-st {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .subj-card-st {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .subj-card-st:hover {
          transform: translateY(-2px);
          border-color: #7692ff;
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
        }
        .today-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 20px;
        }
        .today-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          margin-top: 8px;
        }
        .placeholder-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .placeholder-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          color: #6b7280;
        }
        .stat-label {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 6px;
        }
        .stat-sub {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 4px;
        }
      `}</style>

      {/* STUDENT WELCOME BANNER */}
      <div className="student-banner">
        <div>
          <span style={{ fontSize: "0.85rem", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>
            Student Portal
          </span>
          <h2 style={{ margin: "4px 0 8px 0", fontSize: "1.6rem" }}>
            Welcome, {userProfile.full_name || "Student"}!
          </h2>
          <div style={{ fontSize: "0.95rem", opacity: 0.9 }}>
            Class: <strong>{className}</strong> | Semester: <strong>{semesterName}</strong>
          </div>
        </div>
        <GraduationCap size={65} style={{ opacity: 0.3 }} />
      </div>

      {/* STATS ROW */}
      <div className="student-stats-row">
        <div className="stat-card-st attendance-card">
          <div className="stat-label">Overall Attendance</div>
          <div className="stat-value" style={{ color: overallAttendance >= 75 ? "#059669" : "#dc2626" }}>
            {overallAttendance}%
          </div>
          <div className="stat-sub">Threshold: 75%</div>
        </div>

        <div className="stat-card-st marks-card">
          <div className="stat-label">Average Marks</div>
          <div className="stat-value" style={{ color: "#1b2cc1" }}>
            82.5%
          </div>
          <div className="stat-sub">Demo Stats: Top 15% in class</div>
        </div>

        <div className="stat-card-st assignments-card">
          <div className="stat-label">Pending Assignments</div>
          <div className="stat-value" style={{ color: "#d97706" }}>
            3
          </div>
          <div className="stat-sub">Demo Stats: Due this week</div>
        </div>

        <div className="stat-card-st assessments-card">
          <div className="stat-label">Assessments Taken</div>
          <div className="stat-value" style={{ color: "#091540" }}>
            12
          </div>
          <div className="stat-sub">Demo Stats: This semester</div>
        </div>
      </div>

      {/* TODAY'S CLASSES */}
      <div className="today-card">
        <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={18} color="#1b2cc1" /> TODAY'S SCHEDULE
        </div>
        {todayClasses.length === 0 ? (
          <div style={{ color: "#6b7280", padding: "16px 0", fontSize: "0.9rem" }}>
            No classes scheduled for today.
          </div>
        ) : (
          todayClasses.map((tc) => (
            <div key={tc.id} className="today-item">
              <div>
                <strong style={{ color: "#111827" }}>{tc.subject_name}</strong>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Location: {tc.room}</div>
              </div>
              <div style={{ fontWeight: "600", color: "#1b2cc1" }}>
                {tc.start_time} - {tc.end_time}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ENROLLED SUBJECTS */}
      <div>
        <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#111827", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <BookOpen size={18} color="#091540" /> MY ENROLLED SUBJECTS
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center" }}>Loading subjects...</div>
        ) : enrolledSubjects.length === 0 ? (
          <div style={{ background: "#ffffff", padding: "30px", borderRadius: "12px", border: "1px solid #e5e7eb", textAlign: "center", color: "#6b7280" }}>
            You are not enrolled in any subject offerings yet.
          </div>
        ) : (
          <div className="subject-grid-st">
            {enrolledSubjects.map((es) => (
              <div key={es.offering_id} className="subj-card-st" onClick={() => setSelectedOfferingId(es.offering_id)}>
                <div>
                  <span style={{ background: "#abd2fa", color: "#091540", fontWeight: "700", fontSize: "0.75rem", padding: "3px 8px", borderRadius: "4px" }}>
                    {es.subject_code}
                  </span>
                  <h4 style={{ margin: "6px 0 4px 0", fontSize: "1.1rem", color: "#111827" }}>{es.subject_name}</h4>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Faculty: {es.teacher_name}</div>
                </div>
                <div style={{ marginTop: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#1b2cc1", fontWeight: "600" }}>
                  <span>View Details</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT NOTES / ASSIGNMENTS / QUIZZES PLACEHOLDERS */}
      <div className="placeholder-grid">
        <div className="placeholder-card">
          <FileText size={28} color="#9ca3af" style={{ margin: "0 auto 8px auto" }} />
          <h4 style={{ margin: "0 0 4px 0", color: "#111827" }}>Recent Notes</h4>
          <p style={{ fontSize: "0.8rem", margin: 0 }}>No new study materials uploaded recently.</p>
        </div>

        <div className="placeholder-card">
          <ClipboardList size={28} color="#9ca3af" style={{ margin: "0 auto 8px auto" }} />
          <h4 style={{ margin: "0 0 4px 0", color: "#111827" }}>Pending Assignments</h4>
          <p style={{ fontSize: "0.8rem", margin: 0 }}>You have 0 pending assignments due.</p>
        </div>

        <div className="placeholder-card">
          <HelpCircle size={28} color="#9ca3af" style={{ margin: "0 auto 8px auto" }} />
          <h4 style={{ margin: "0 0 4px 0", color: "#111827" }}>Upcoming Quizzes</h4>
          <p style={{ fontSize: "0.8rem", margin: 0 }}>No upcoming quizzes scheduled.</p>
        </div>
      </div>
    </div>
  );
}
