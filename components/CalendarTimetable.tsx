"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, BookOpen } from "lucide-react";

export type RoutineEntry = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
  subject_name: string;
  class_name: string;
  teacher_name?: string;
};

interface Props {
  routines: RoutineEntry[];
  role: "teacher" | "student" | "coordinator";
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function CalendarTimetable({ routines, role }: Props) {
  const [view, setView] = useState<"calendar" | "weekly">("calendar");
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const goPrevDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() - 1);
    setSelectedDate(next);
  };

  const goNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };

  const selectedDayName = DAYS_OF_WEEK[selectedDate.getDay()];

  const dateDisplay = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const isToday = useMemo(() => {
    const d = new Date();
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate]);

  const nowStr = useMemo(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }, [selectedDate]); 

  const dailyRoutines = useMemo(() => {
    return routines
      .filter((r) => r.day_of_week === selectedDayName)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [routines, selectedDayName]);

  const weeklyRoutines = useMemo(() => {
    const map: Record<string, RoutineEntry[]> = {};
    DAYS_OF_WEEK.forEach(day => {
      map[day] = routines
        .filter((r) => r.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return map;
  }, [routines]);

  return (
    <div className="calendar-timetable">
      <style>{`
        .calendar-timetable {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          overflow: hidden;
        }
        .ct-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #fafafa;
          flex-wrap: wrap;
          gap: 16px;
        }
        .ct-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ct-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ct-view-toggle {
          display: flex;
          background: #e5e7eb;
          border-radius: 6px;
          padding: 2px;
        }
        .ct-view-btn {
          padding: 6px 12px;
          font-size: 0.85rem;
          font-weight: 500;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          color: #4b5563;
        }
        .ct-view-btn.active {
          background: #ffffff;
          color: #450c3f;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .nav-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .icon-btn {
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px;
          cursor: pointer;
          color: #4b5563;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover { background: #f3f4f6; }
        .today-btn {
          padding: 6px 12px;
          font-size: 0.85rem;
          font-weight: 500;
          border: 1px solid #d1d5db;
          background: #ffffff;
          border-radius: 6px;
          cursor: pointer;
          color: #111827;
        }
        .today-btn:hover { background: #f3f4f6; }
        .date-display {
          font-weight: 600;
          color: #450c3f;
          min-width: 180px;
          text-align: center;
        }
        
        .ct-body {
          padding: 24px;
        }
        .empty-day {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px dashed #d1d5db;
        }
        
        /* Daily View */
        .timeline {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .timeline-item {
          display: flex;
          gap: 16px;
        }
        .time-col {
          width: 80px;
          flex-shrink: 0;
          text-align: right;
          color: #6b7280;
          font-size: 0.85rem;
          font-weight: 500;
          padding-top: 12px;
        }
        .card-col {
          flex-grow: 1;
        }
        .session-card {
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #450c3f;
          background: #ffffff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          border-top: 1px solid #f3f4f6;
          border-right: 1px solid #f3f4f6;
          border-bottom: 1px solid #f3f4f6;
          position: relative;
        }
        .session-card.past { opacity: 0.6; border-left-color: #9ca3af; }
        .session-card.current { border-left-color: #10b981; background: #ecfdf5; }
        .session-card.upcoming { border-left-color: #3b82f6; }
        
        .status-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }
        .status-badge.past { background: #f3f4f6; color: #6b7280; }
        .status-badge.current { background: #d1fae5; color: #059669; animation: pulse 2s infinite; }
        .status-badge.upcoming { background: #dbeafe; color: #2563eb; }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }

        .session-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .session-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 12px;
          font-size: 0.85rem;
          color: #4b5563;
        }
        .detail-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        /* Weekly View */
        .weekly-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        .weekly-day-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .weekly-day-header {
          text-align: center;
          font-weight: 600;
          color: #450c3f;
          padding: 8px;
          background: #fafafa;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          margin-bottom: 8px;
        }
        .weekly-session {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-left: 3px solid #450c3f;
          border-radius: 6px;
          padding: 8px;
          font-size: 0.75rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .weekly-time { font-weight: 600; color: #111827; margin-bottom: 4px; }
        .weekly-subj { font-weight: 500; color: #450c3f; margin-bottom: 4px; }
        .weekly-meta { color: #6b7280; display: flex; flex-direction: column; gap: 2px; }

        @media (max-width: 1024px) {
          .weekly-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 640px) {
          .weekly-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ct-header">
        <div className="ct-title">
          <CalendarIcon size={20} color="#450c3f" />
          {role === "student" ? "My Class Routine" : role === "teacher" ? "My Teaching Schedule" : "Master Timetable"}
        </div>
        
        <div className="ct-controls">
          <div className="ct-view-toggle">
            <button className={`ct-view-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView("calendar")}>Daily Calendar</button>
            <button className={`ct-view-btn ${view === 'weekly' ? 'active' : ''}`} onClick={() => setView("weekly")}>Weekly Timetable</button>
          </div>
        </div>
      </div>

      <div className="ct-body">
        {view === "calendar" && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
              <div className="nav-controls">
                <button className="icon-btn" onClick={goPrevDay}><ChevronLeft size={16} /></button>
                <button className="today-btn" onClick={goToday}>Today</button>
                <div className="date-display">{dateDisplay}</div>
                <button className="icon-btn" onClick={goNextDay}><ChevronRight size={16} /></button>
              </div>
            </div>

            {dailyRoutines.length === 0 ? (
              <div className="empty-day">
                <CalendarIcon size={32} color="#9ca3af" style={{ margin: "0 auto 12px" }} />
                <h3>No classes scheduled</h3>
                <p>Enjoy your free time!</p>
              </div>
            ) : (
              <div className="timeline">
                {dailyRoutines.map(r => {
                  let status: "past" | "current" | "upcoming" = "upcoming";
                  if (isToday) {
                    if (nowStr >= r.end_time) status = "past";
                    else if (nowStr >= r.start_time && nowStr < r.end_time) status = "current";
                  } else if (selectedDate < new Date(new Date().setHours(0,0,0,0))) {
                    status = "past";
                  }
                  
                  return (
                    <div className="timeline-item" key={r.id}>
                      <div className="time-col">
                        <div>{r.start_time}</div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{r.end_time}</div>
                      </div>
                      <div className="card-col">
                        <div className={`session-card ${status}`}>
                          <span className={`status-badge ${status}`}>{status}</span>
                          <div className="session-title">
                            <BookOpen size={16} color="#450c3f" /> {r.subject_name}
                          </div>
                          <div className="session-details">
                            <div className="detail-item">
                              <MapPin size={14} color="#6b7280" /> {r.room || "TBA"}
                            </div>
                            <div className="detail-item">
                              <User size={14} color="#6b7280" /> 
                              {role === "teacher" ? `Class: ${r.class_name}` : role === "student" ? `Teacher: ${r.teacher_name || "TBA"}` : `${r.class_name} | ${r.teacher_name}`}
                            </div>
                            <div className="detail-item" style={{ marginLeft: "auto", fontWeight: 500, color: status === 'current' ? "#059669" : "#4b5563" }}>
                              <Clock size={14} color={status === 'current' ? "#059669" : "#6b7280"} /> {r.start_time} - {r.end_time}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {view === "weekly" && (
          <div className="weekly-grid">
            {DAYS_OF_WEEK.filter(d => d !== "Sunday").map(day => (
              <div className="weekly-day-col" key={day}>
                <div className="weekly-day-header">{day}</div>
                {weeklyRoutines[day].length === 0 ? (
                  <div style={{ textAlign: "center", color: "#9ca3af", fontSize: "0.75rem", padding: "12px 0" }}>No classes</div>
                ) : (
                  weeklyRoutines[day].map(r => (
                    <div className="weekly-session" key={r.id}>
                      <div className="weekly-time">{r.start_time} - {r.end_time}</div>
                      <div className="weekly-subj">{r.subject_name}</div>
                      <div className="weekly-meta">
                        <span>{role === "teacher" ? r.class_name : r.teacher_name}</span>
                        <span>Room: {r.room || "TBA"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
