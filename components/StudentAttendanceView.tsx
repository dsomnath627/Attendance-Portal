"use client";

/**
 * StudentAttendanceView.tsx
 * =========================
 * Shows a student's attendance statistics and history for a specific subject offering.
 * Recalculates from persisted DB records, never from client-only state.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import { CalendarCheck, RefreshCw, CheckCircle, XCircle, TrendingUp } from "lucide-react";

type AttendanceHistoryRow = {
  session_id: string;
  attendance_date: string;
  status: "P" | "A";
  detected_code: string | null;
};

type Stats = {
  total: number;
  present: number;
  absent: number;
  percentage: number;
};

export default function StudentAttendanceView({
  offeringId,
  userProfile,
}: {
  offeringId: string;
  userProfile: UserProfile;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAttendance() {
    setLoading(true);
    setError(null);
    try {
      // 1. Find the student's institutional record
      const { data: studentRecord, error: studentErr } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", userProfile.id)
        .maybeSingle();

      if (studentErr) throw new Error(studentErr.message);

      if (!studentRecord) {
        setError("Your account has no institutional student record linked yet. Contact the Coordinator.");
        setLoading(false);
        return;
      }

      const studentId = studentRecord.id;

      // 2. Get all sessions for this offering
      const { data: sessions, error: sessErr } = await supabase
        .from("attendance_sessions")
        .select("id, attendance_date")
        .eq("subject_offering_id", offeringId)
        .order("attendance_date", { ascending: false });

      if (sessErr) throw new Error(sessErr.message);

      if (!sessions || sessions.length === 0) {
        setStats({ total: 0, present: 0, absent: 0, percentage: 100 });
        setHistory([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map((s: any) => s.id);

      // 3. Get student's records for these sessions
      const { data: records, error: recErr } = await supabase
        .from("attendance_records")
        .select("session_id, status, detected_code")
        .eq("student_id", studentId)
        .in("session_id", sessionIds);

      if (recErr) throw new Error(recErr.message);

      // 4. Build history: only sessions where the student has a record
      const recordMap: Record<string, { status: "P" | "A"; detected_code: string | null }> = {};
      (records || []).forEach((r: any) => {
        recordMap[r.session_id] = { status: r.status, detected_code: r.detected_code };
      });

      const historyRows: AttendanceHistoryRow[] = sessions
        .filter((s: any) => recordMap[s.id]) // only sessions with a record for this student
        .map((s: any) => ({
          session_id: s.id,
          attendance_date: s.attendance_date,
          status: recordMap[s.id].status,
          detected_code: recordMap[s.id].detected_code,
        }));

      const totalSessions = historyRows.length;
      const presentCount = historyRows.filter((r) => r.status === "P").length;
      const absentCount = totalSessions - presentCount;
      const pct = totalSessions === 0 ? 100 : Math.round((presentCount / totalSessions) * 100);

      setStats({ total: totalSessions, present: presentCount, absent: absentCount, percentage: pct });
      setHistory(historyRows);
    } catch (err) {
      console.error("StudentAttendanceView error:", err);
      setError(err instanceof Error ? err.message : "Failed to load attendance.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAttendance();
  }, [offeringId, userProfile.id]);

  if (loading) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>
        <RefreshCw size={22} style={{ animation: "spin 1s linear infinite" }} />
        <div style={{ marginTop: 8 }}>Loading attendance…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, background: "#fee2e2", borderRadius: 10, color: "#b91c1c", fontWeight: 600 }}>
        {error}
      </div>
    );
  }

  const pctColor = (stats?.percentage ?? 100) >= 75 ? "#059669" : "#dc2626";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .sav-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .sav-stat-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }
        .sav-hist-table { width: 100%; border-collapse: collapse; }
        .sav-hist-table th {
          padding: 9px 12px;
          text-align: left;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
        }
        .sav-hist-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
        }
      `}</style>

      {/* Stats cards */}
      <div className="sav-stat-grid">
        <div className="sav-stat-box">
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Total Sessions</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#111827" }}>{stats?.total ?? 0}</div>
        </div>
        <div className="sav-stat-box">
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Present</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#059669" }}>{stats?.present ?? 0}</div>
        </div>
        <div className="sav-stat-box">
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Absent</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#dc2626" }}>{stats?.absent ?? 0}</div>
        </div>
        <div className="sav-stat-box">
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Attendance %</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: pctColor }}>{stats?.percentage ?? 100}%</div>
          {(stats?.percentage ?? 100) < 75 && (
            <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4, fontWeight: 600 }}>
              ⚠ Below 75% threshold
            </div>
          )}
        </div>
      </div>

      {/* Attendance bar */}
      {stats && stats.total > 0 && (
        <div>
          <div style={{ height: 10, background: "#fee2e2", borderRadius: 10, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${stats.percentage}%`,
                background: pctColor,
                borderRadius: 10,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>
            <span>0%</span>
            <span style={{ color: "#b45309" }}>75% threshold</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* History table */}
      <div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarCheck size={18} color="#450c3f" />
          Session-by-Session History
        </div>

        {history.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            No attendance records found for your account in this subject.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="sav-hist-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, idx) => (
                  <tr key={row.session_id}>
                    <td style={{ color: "#9ca3af" }}>{history.length - idx}</td>
                    <td style={{ fontWeight: 600 }}>{row.attendance_date}</td>
                    <td>
                      {row.status === "P" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#059669", fontWeight: 700, background: "#dcfce7", padding: "3px 10px", borderRadius: 20 }}>
                          <CheckCircle size={13} /> Present
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#dc2626", fontWeight: 700, background: "#fee2e2", padding: "3px 10px", borderRadius: 20 }}>
                          <XCircle size={13} /> Absent
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      {row.detected_code ? `OCR (${row.detected_code})` : "Manual"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
