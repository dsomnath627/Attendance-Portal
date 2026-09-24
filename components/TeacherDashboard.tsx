"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import SubjectPage from "./SubjectPage";
import {
  BookOpen,
  CalendarCheck,
  Users,
  Clock,
  ChevronRight,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";

type TeacherOffering = {
  id: string;
  subject_id: string;
  class_id: string;
  subject_name: string;
  subject_code: string;
  class_name: string;
  student_count: number;
  next_class: string;
};

type RoutineSlot = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
  subject_name: string;
  class_name: string;
};

export default function TeacherDashboard({
  userProfile,
  onNavigateTab,
}: {
  userProfile: UserProfile;
  onNavigateTab?: (tab: string) => void;
}) {
  const [offerings, setOfferings] = useState<TeacherOffering[]>([]);
  const [teacherRoutines, setTeacherRoutines] = useState<RoutineSlot[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadTeacherDashboard() {
    setLoading(true);
    try {
      // 1. Fetch subject_offerings assigned to this teacher
      const { data: myOfferings } = await supabase
        .from("subject_offerings")
        .select(`
          id,
          subject_id,
          class_id,
          subjects (name, code),
          classes (name)
        `)
        .eq("teacher_id", userProfile.id);

      // 2. Fetch routines for this teacher
      const { data: myRoutines } = await supabase
        .from("routines")
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          room,
          class_id,
          subject_offering_id,
          classes (name),
          subject_offerings (
            subjects (name)
          )
        `)
        .eq("teacher_id", userProfile.id);

      const formattedRoutines: RoutineSlot[] = (myRoutines || []).map((r: any) => ({
        id: r.id,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        room: r.room || "Room N/A",
        subject_name: r.subject_offerings?.subjects?.name || "Subject",
        class_name: r.classes?.name || "Class",
      }));
      setTeacherRoutines(formattedRoutines);

      if (myOfferings) {
        const formattedOfferings: TeacherOffering[] = await Promise.all(
          myOfferings.map(async (o: any) => {
            // Count students enrolled in this class
            const { count } = await supabase
              .from("class_enrollments")
              .select("*", { count: "exact", head: true })
              .eq("class_id", o.class_id);

            // Find next class schedule from routines
            const matchingRoutines = formattedRoutines.filter(
              (rt) => rt.class_name === o.classes?.name
            );
            const nextClassStr = matchingRoutines.length > 0
              ? `${matchingRoutines[0].day_of_week} ${matchingRoutines[0].start_time}`
              : "No schedule set";

            return {
              id: o.id,
              subject_id: o.subject_id,
              class_id: o.class_id,
              subject_name: o.subjects?.name || "Subject",
              subject_code: o.subjects?.code || "SUBJ",
              class_name: o.classes?.name || "Class",
              student_count: count || 0,
              next_class: nextClassStr,
            };
          })
        );
        setOfferings(formattedOfferings);
      }
    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTeacherDashboard();
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
    <div className="teacher-dashboard">
      <style>{`
        .teacher-dashboard { display: flex; flex-direction: column; gap: 24px; }
        .welcome-banner {
          background: linear-gradient(135deg, #450c3f 0%, #2b0728 100%);
          color: #ffffff;
          padding: 28px;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(69, 12, 63, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .offering-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .offering-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .offering-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          border-color: #b9d175;
        }
        .code-pill {
          background: #f5fbda;
          color: #450c3f;
          font-weight: 700;
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 8px;
        }
        .routine-table-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 20px;
        }
        .routine-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .routine-row:last-child { border-bottom: none; }
      `}</style>

      {/* WELCOME BANNER */}
      <div className="welcome-banner">
        <div>
          <span style={{ fontSize: "0.85rem", opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>
            Teacher Workspace
          </span>
          <h2 style={{ margin: "4px 0 8px 0", fontSize: "1.6rem" }}>
            Hello, {userProfile.full_name || "Professor"}!
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "0.95rem" }}>
            You have {offerings.length} assigned subject offering{offerings.length === 1 ? "" : "s"} this semester.
          </p>
        </div>
        <BookOpen size={60} style={{ opacity: 0.3 }} />
      </div>

      {/* MY SUBJECTS SECTION */}
      <div>
        <div className="section-title">
          <BookOpen size={20} color="#450c3f" /> MY SUBJECTS
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>Loading your assigned classes...</div>
        ) : offerings.length === 0 ? (
          <div style={{ background: "#ffffff", padding: "40px", borderRadius: "12px", textAlign: "center", color: "#6b7280", border: "1px solid #e5e7eb" }}>
            No subject offerings currently assigned to your account.
          </div>
        ) : (
          <div className="offering-grid">
            {offerings.map((o) => (
              <div key={o.id} className="offering-card" onClick={() => setSelectedOfferingId(o.id)}>
                <div>
                  <span className="code-pill">{o.subject_code}</span>
                  <h3 style={{ margin: "4px 0 4px 0", fontSize: "1.2rem", color: "#111827" }}>
                    {o.subject_name}
                  </h3>
                  <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#450c3f" }}>
                    Class: {o.class_name}
                  </div>
                </div>

                <div style={{ marginTop: "20px", borderTop: "1px solid #f3f4f6", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Users size={14} /> {o.student_count} Students
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                      <Clock size={14} /> Next: {o.next_class}
                    </div>
                  </div>
                  <ChevronRight size={18} color="#450c3f" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TEACHER ROUTINE TIMETABLE */}
      <div className="routine-table-card">
        <div className="section-title">
          <Clock size={20} color="#450c3f" /> MY WEEKLY TEACHING SCHEDULE
        </div>
        {teacherRoutines.length === 0 ? (
          <div style={{ color: "#6b7280", padding: "16px 0" }}>No teaching schedule entry configured yet.</div>
        ) : (
          <div>
            {teacherRoutines.map((r) => (
              <div key={r.id} className="routine-row">
                <div>
                  <strong style={{ color: "#111827" }}>{r.day_of_week}</strong>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                    {r.subject_name} ({r.class_name})
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, color: "#450c3f" }}>{r.start_time} - {r.end_time}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>📍 {r.room}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
