"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────
//  MOCK DATA
// ─────────────────────────────────────────────
const STATS = [
  { value: "94%", label: "Average Attendance Rate", icon: "📊" },
  { value: "1,200+", label: "Active Students", icon: "🎓" },
  { value: "48", label: "Subjects Offered", icon: "📚" },
  { value: "0 mins", label: "Manual Work Saved/Day", icon: "⚡" },
];

const FEATURES = [
  {
    icon: "🔍",
    title: "OCR Attendance",
    desc: "Snap a photo of any handwritten attendance sheet. Our AI engine reads, parses and logs every entry in seconds — even messy handwriting.",
    tag: "Powered by Tesseract AI",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.08)",
  },
  {
    icon: "📐",
    title: "Academic Structure Builder",
    desc: "Model your entire university hierarchy — Departments → Programs → Batches → Classes → Subjects → Subject Offerings — in minutes.",
    tag: "Coordinator Tool",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.08)",
  },
  {
    icon: "👨‍🏫",
    title: "Teacher Workspace",
    desc: "Teachers see only their assigned subjects and classes. Take attendance, manage marks, upload notes — all from one clean dashboard.",
    tag: "Role-Based Access",
    color: "#450c3f",
    bg: "rgba(69,12,63,0.08)",
  },
  {
    icon: "🎓",
    title: "Student Portal",
    desc: "Students get real-time attendance %, upcoming lectures, subject details, notes and quiz schedules — personalized to their enrolled class.",
    tag: "Student View",
    color: "#0a5cc7",
    bg: "rgba(10,92,199,0.08)",
  },
  {
    icon: "📊",
    title: "Excel Import & Export",
    desc: "Bulk-import student marks and attendance from existing Excel workbooks. Export audit-ready reports in one click.",
    tag: "Zero Migration Pain",
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
  },
  {
    icon: "🛡️",
    title: "RLS Security",
    desc: "Row Level Security enforced at the database layer. Teachers can't see other teachers' data. Admins have full oversight. No trust issues.",
    tag: "Supabase + PostgreSQL",
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
  },
];

const ROLES = [
  {
    role: "Super Admin",
    emoji: "⚡",
    color: "#f59e0b",
    desc: "Verify users, assign roles, monitor the entire institution from a single control panel.",
    actions: ["Approve / Reject / Suspend users", "Change user roles instantly", "System-wide attendance overview"],
    bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    border: "#fcd34d",
  },
  {
    role: "Coordinator",
    emoji: "👔",
    color: "#3b82f6",
    desc: "Build the academic skeleton — programs, classes, subjects — and link teachers to their classes.",
    actions: ["Create Departments & Programs", "Assign Teachers to Subject Offerings", "Manage Routines & Enrollments"],
    bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    border: "#93c5fd",
  },
  {
    role: "Teacher",
    emoji: "👨‍🏫",
    color: "#450c3f",
    desc: "A focused workspace showing only your assigned subjects, your students, and your schedule.",
    actions: ["OCR Photo Attendance", "Manual Attendance Override", "Marks Management & Excel Export"],
    bg: "linear-gradient(135deg, #fdf4ff 0%, #f5fbda 100%)",
    border: "#b9d175",
  },
  {
    role: "Student",
    emoji: "🎓",
    color: "#1b2cc1",
    desc: "Track attendance, view upcoming classes, access subject materials and grades in one place.",
    actions: ["Live Attendance Percentage", "Subject Cards with Teacher Info", "Today's Class Schedule"],
    bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    border: "#7692ff",
  },
];

const TESTIMONIALS = [
  {
    name: "Dr. Anjali Sharma",
    role: "HOD — Computer Science",
    quote: "Dr. Campus cut our attendance reconciliation time from 3 hours to under 5 minutes per week. The OCR feature alone is worth it.",
    avatar: "AS",
    color: "#450c3f",
  },
  {
    name: "Rahul Mehta",
    role: "Coordinator, TIU",
    quote: "Setting up 12 classes, 40 subjects and assigning all teachers took me 20 minutes. It would have taken days on our old system.",
    avatar: "RM",
    color: "#1b2cc1",
  },
  {
    name: "Priya Bose",
    role: "B.Tech CSE — Semester 5",
    quote: "I can check my attendance for every subject in real time. No more guessing if I'm going to be detained!",
    avatar: "PB",
    color: "#059669",
  },
];

const WORKFLOW_STEPS = [
  { step: "01", title: "Admin Verifies Users", desc: "Coordinators, Teachers and Students register. Super Admin approves in one click.", icon: "✅" },
  { step: "02", title: "Coordinator Builds Structure", desc: "Departments, Classes, Subjects, and Teacher Assignments set up in minutes.", icon: "🏗️" },
  { step: "03", title: "Teachers Take Attendance", desc: "Upload a handwritten sheet photo. OCR auto-fills the roster. Done.", icon: "📸" },
  { step: "04", title: "Students Track Progress", desc: "Live attendance %, schedules and subject pages — all in one dashboard.", icon: "📱" },
];

// ─────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────
export default function LandingPage() {
  const [activeRole, setActiveRole] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [demoStat, setDemoStat] = useState({ students: 0, subjects: 0, teachers: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Count-up animation
  useEffect(() => {
    const targets = { students: 1248, subjects: 48, teachers: 64 };
    const duration = 1800;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDemoStat({
        students: Math.round(targets.students * ease),
        subjects: Math.round(targets.subjects * ease),
        teachers: Math.round(targets.teachers * ease),
      });
      if (progress < 1) requestAnimationFrame(tick);
    };
    const t = setTimeout(() => requestAnimationFrame(tick), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="lp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        .lp-root {
          font-family: 'Inter', sans-serif;
          background: #0a0a12;
          color: #f1f5f9;
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ── NAV ── */
        .lp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 16px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.3s ease;
        }
        .lp-nav.scrolled {
          background: rgba(10,10,18,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 12px 40px;
        }
        .lp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: white;
        }
        .lp-logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .lp-logo-text {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.3rem;
          font-weight: 800;
          background: linear-gradient(90deg, #fff 60%, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lp-nav-links {
          display: flex;
          gap: 32px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .lp-nav-links a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .lp-nav-links a:hover { color: #f1f5f9; }
        .lp-nav-btns {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .lp-btn-ghost {
          padding: 9px 20px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          background: transparent;
          color: #f1f5f9;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
        }
        .lp-btn-ghost:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.2);
        }
        .lp-btn-primary {
          padding: 10px 22px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
        }
        .lp-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.45);
        }

        /* ── HERO ── */
        .lp-hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 120px 24px 80px;
          position: relative;
          overflow: hidden;
        }
        .hero-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 80% 30%, rgba(139,92,246,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 20% 60%, rgba(6,182,212,0.08) 0%, transparent 60%);
        }
        .hero-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 70%);
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid rgba(99,102,241,0.3);
          background: rgba(99,102,241,0.08);
          color: #a78bfa;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }
        .hero-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6366f1;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .hero-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(2.8rem, 6vw, 5rem);
          font-weight: 800;
          line-height: 1.1;
          margin: 0 0 24px;
          position: relative;
          z-index: 1;
        }
        .hero-title-gradient {
          background: linear-gradient(135deg, #fff 30%, #a78bfa 70%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          max-width: 620px;
          font-size: 1.15rem;
          color: #94a3b8;
          line-height: 1.7;
          margin: 0 auto 40px;
          position: relative;
          z-index: 1;
        }
        .hero-ctas {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .hero-cta-primary {
          padding: 16px 36px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 28px rgba(99,102,241,0.4);
          transition: all 0.25s ease;
        }
        .hero-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(99,102,241,0.5);
        }
        .hero-cta-secondary {
          padding: 16px 36px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: #e2e8f0;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
        }
        .hero-cta-secondary:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
        }

        /* ── DASHBOARD MOCKUP ── */
        .hero-mockup-wrap {
          margin-top: 72px;
          width: 100%;
          max-width: 1080px;
          position: relative;
          z-index: 1;
        }
        .mockup-glow {
          position: absolute;
          bottom: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 80px;
          background: rgba(99,102,241,0.25);
          filter: blur(40px);
          border-radius: 50%;
          z-index: 0;
        }
        .mockup-frame {
          position: relative;
          z-index: 1;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: #0f1117;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
        }
        .mockup-topbar {
          background: #151520;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .mock-dot { width: 12px; height: 12px; border-radius: 50%; }
        .mockup-body {
          display: flex;
          height: 380px;
          font-size: 11px;
        }
        .mock-sidebar {
          width: 200px;
          background: #0c0c18;
          border-right: 1px solid rgba(255,255,255,0.06);
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-shrink: 0;
        }
        .mock-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px 16px;
          color: #f1f5f9;
          font-weight: 700;
          font-size: 13px;
        }
        .mock-brand-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .mock-nav-item {
          padding: 8px 10px;
          border-radius: 8px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mock-nav-item.active {
          background: rgba(99,102,241,0.15);
          color: #a78bfa;
        }
        .mock-main {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #0a0a12;
          overflow: hidden;
        }
        .mock-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .mock-title { font-size: 16px; font-weight: 700; color: #f1f5f9; }
        .mock-subtitle { color: #64748b; font-size: 11px; margin-top: 2px; }
        .mock-pill {
          padding: 5px 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 8px;
          color: white;
          font-size: 11px;
          font-weight: 600;
        }
        .mock-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .mock-stat {
          background: #151520;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 12px;
        }
        .mock-stat-val {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
          line-height: 1;
        }
        .mock-stat-label {
          font-size: 10px;
          color: #64748b;
          margin-top: 4px;
        }
        .mock-cards-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          flex: 1;
        }
        .mock-card {
          background: #151520;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mock-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mock-card-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .mock-card-title { font-weight: 600; color: #e2e8f0; font-size: 12px; }
        .mock-card-sub { font-size: 10px; color: #64748b; }
        .mock-bar-track {
          height: 4px;
          background: rgba(255,255,255,0.05);
          border-radius: 9999px;
          margin-top: auto;
        }
        .mock-bar-fill {
          height: 4px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
        }

        /* ── SECTION WRAPPERS ── */
        .lp-section {
          padding: 100px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .lp-section-label {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #6366f1;
          margin-bottom: 16px;
        }
        .lp-section-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          text-align: center;
          color: #f1f5f9;
          margin: 0 0 16px;
          line-height: 1.2;
        }
        .lp-section-sub {
          text-align: center;
          color: #64748b;
          font-size: 1.05rem;
          max-width: 600px;
          margin: 0 auto 60px;
          line-height: 1.7;
        }

        /* ── DIVIDER ── */
        .lp-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent);
          margin: 0 40px;
        }

        /* ── STATS BAND ── */
        .stats-band {
          background: rgba(99,102,241,0.06);
          border-top: 1px solid rgba(99,102,241,0.15);
          border-bottom: 1px solid rgba(99,102,241,0.15);
          padding: 50px 24px;
        }
        .stats-band-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          text-align: center;
        }
        .stat-item-icon { font-size: 2rem; }
        .stat-item-val {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          color: #f1f5f9;
          line-height: 1;
          margin: 12px 0 6px;
        }
        .stat-item-label { color: #64748b; font-size: 0.9rem; }

        /* ── FEATURES GRID ── */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .feat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 28px;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .feat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--feat-color), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .feat-card:hover {
          background: rgba(255,255,255,0.055);
          border-color: rgba(255,255,255,0.12);
          transform: translateY(-4px);
        }
        .feat-card:hover::before { opacity: 1; }
        .feat-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 18px;
        }
        .feat-tag {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 14px;
          border: 1px solid;
        }
        .feat-card h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 12px;
        }
        .feat-card p {
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.7;
          margin: 0;
        }

        /* ── HOW IT WORKS ── */
        .workflow-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          position: relative;
        }
        .workflow-grid::before {
          content: '';
          position: absolute;
          top: 32px;
          left: calc(12.5% + 16px);
          right: calc(12.5% + 16px);
          height: 2px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1);
          opacity: 0.3;
        }
        .workflow-step {
          text-align: center;
          position: relative;
        }
        .workflow-step-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(99,102,241,0.1);
          border: 2px solid rgba(99,102,241,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 20px;
          position: relative;
          z-index: 1;
        }
        .workflow-step-num {
          font-size: 0.7rem;
          font-weight: 800;
          color: #6366f1;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .workflow-step h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 10px;
        }
        .workflow-step p {
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0;
        }

        /* ── ROLES SECTION ── */
        .roles-tabs {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }
        .role-tab-btn {
          padding: 10px 24px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .role-tab-btn.active {
          background: rgba(99,102,241,0.15);
          border-color: rgba(99,102,241,0.4);
          color: #a78bfa;
        }
        .role-tab-btn:hover:not(.active) {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.15);
          color: #e2e8f0;
        }
        .role-content-card {
          max-width: 800px;
          margin: 0 auto;
          border-radius: 24px;
          padding: 48px;
          transition: all 0.4s ease;
        }
        .role-content-inner {
          display: flex;
          gap: 48px;
          align-items: flex-start;
        }
        .role-big-emoji {
          font-size: 4rem;
          flex-shrink: 0;
        }
        .role-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0 0 10px;
        }
        .role-desc {
          color: #475569;
          line-height: 1.7;
          margin: 0 0 24px;
          font-size: 1rem;
        }
        .role-actions {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .role-actions li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #334155;
        }
        .role-actions li::before {
          content: '✓';
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(99,102,241,0.12);
          color: #6366f1;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        /* ── TESTIMONIALS ── */
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .testimonial-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 32px;
          transition: all 0.25s ease;
        }
        .testimonial-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
          transform: translateY(-3px);
        }
        .testimonial-stars {
          color: #fbbf24;
          font-size: 1rem;
          margin-bottom: 16px;
        }
        .testimonial-quote {
          color: #cbd5e1;
          font-size: 0.95rem;
          line-height: 1.75;
          margin: 0 0 24px;
          font-style: italic;
        }
        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .testimonial-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          color: white;
          flex-shrink: 0;
        }
        .testimonial-name {
          font-weight: 700;
          color: #f1f5f9;
          font-size: 0.95rem;
        }
        .testimonial-role {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 2px;
        }

        /* ── LIVE DASHBOARD STATS SECTION ── */
        .live-demo-section {
          background: rgba(99,102,241,0.04);
          border-top: 1px solid rgba(99,102,241,0.1);
          border-bottom: 1px solid rgba(99,102,241,0.1);
          padding: 80px 24px;
        }
        .live-demo-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          gap: 60px;
          align-items: center;
        }
        .live-demo-text { flex: 1; }
        .live-demo-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #f1f5f9;
          line-height: 1.3;
          margin: 0 0 16px;
        }
        .live-demo-sub {
          color: #64748b;
          line-height: 1.7;
          margin: 0 0 32px;
        }
        .live-demo-counters {
          display: flex;
          gap: 32px;
        }
        .counter-item-val {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #6366f1, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1;
        }
        .counter-item-label {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 4px;
        }
        .live-demo-visual {
          flex: 0 0 400px;
        }
        .attendance-card-demo {
          background: #151520;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 24px;
          font-size: 13px;
        }
        .att-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .att-title { font-weight: 700; color: #f1f5f9; font-size: 15px; }
        .att-badge {
          padding: 4px 12px;
          background: rgba(5,150,105,0.15);
          color: #34d399;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
        }
        .att-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .att-row:last-child { border-bottom: none; }
        .att-student { display: flex; align-items: center; gap: 10px; }
        .att-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 11px;
        }
        .att-name { color: #e2e8f0; font-weight: 500; }
        .att-id { color: #64748b; font-size: 11px; }
        .att-status-p {
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(5,150,105,0.12);
          color: #34d399;
          font-weight: 700;
          font-size: 11px;
        }
        .att-status-a {
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(239,68,68,0.12);
          color: #f87171;
          font-weight: 700;
          font-size: 11px;
        }
        .att-ocr-tag {
          padding: 4px 8px;
          background: rgba(99,102,241,0.1);
          color: #a78bfa;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
        }

        /* ── CTA BANNER ── */
        .cta-banner {
          margin: 0 40px 80px;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 28px;
          padding: 72px 60px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 70% at 50% 0%, rgba(99,102,241,0.3), transparent);
          pointer-events: none;
        }
        .cta-banner-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: clamp(1.8rem, 4vw, 3rem);
          font-weight: 800;
          color: #f1f5f9;
          margin: 0 0 16px;
          position: relative;
        }
        .cta-banner-sub {
          color: #a5b4fc;
          font-size: 1.05rem;
          max-width: 560px;
          margin: 0 auto 40px;
          line-height: 1.7;
          position: relative;
        }
        .cta-banner-btns {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
        }
        .cta-big-btn {
          padding: 16px 40px;
          border-radius: 14px;
          border: none;
          background: white;
          color: #1e1b4b;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
          box-shadow: 0 8px 28px rgba(0,0,0,0.3);
        }
        .cta-big-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.4);
        }

        /* ── FOOTER ── */
        .lp-footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 60px 40px 40px;
        }
        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
        }
        .footer-brand-desc {
          color: #475569;
          font-size: 0.9rem;
          line-height: 1.7;
          margin: 14px 0 24px;
        }
        .footer-col-title {
          font-weight: 700;
          color: #94a3b8;
          font-size: 0.8rem;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 18px;
        }
        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .footer-links a {
          color: #475569;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        .footer-links a:hover { color: #94a3b8; }
        .footer-bottom {
          max-width: 1200px;
          margin: 40px auto 0;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #334155;
          font-size: 0.85rem;
        }
        .footer-bottom-links {
          display: flex;
          gap: 24px;
        }
        .footer-bottom-links a {
          color: #334155;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-bottom-links a:hover { color: #64748b; }

        @media (max-width: 900px) {
          .features-grid, .testimonials-grid { grid-template-columns: 1fr; }
          .workflow-grid { grid-template-columns: 1fr 1fr; }
          .workflow-grid::before { display: none; }
          .live-demo-inner { flex-direction: column; }
          .live-demo-visual { width: 100%; flex: unset; }
          .stats-band-inner { grid-template-columns: 1fr 1fr; }
          .footer-inner { grid-template-columns: 1fr; }
          .mockup-body { display: none; }
          .cta-banner { margin: 0 16px 60px; padding: 48px 24px; }
          .lp-nav-links { display: none; }
        }
      `}</style>

      {/* NAV */}
      <nav className={`lp-nav${scrolled ? " scrolled" : ""}`}>
        <a href="#" className="lp-logo">
          <div className="lp-logo-icon">🎓</div>
          <span className="lp-logo-text">Dr. Campus</span>
        </a>
        <ul className="lp-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#roles">Roles</a></li>
          <li><a href="#testimonials">Reviews</a></li>
        </ul>
        <div className="lp-nav-btns">
          <Link href="/" className="lp-btn-ghost">Sign In</Link>
          <Link href="/" className="lp-btn-primary">Get Started Free →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero" ref={heroRef}>
        <div className="hero-glow" />
        <div className="hero-grid" />

        <div className="hero-badge">
          <div className="hero-badge-dot" />
          Now with AI-powered OCR Attendance
        </div>

        <h1 className="hero-title">
          <span className="hero-title-gradient">The OS for your</span>
          <br />
          <span className="hero-title-gradient">entire university</span>
        </h1>

        <p className="hero-sub">
          Dr. Campus connects Super Admin, Coordinators, Teachers and Students in one intelligent academic platform. From OCR attendance to real-time subject tracking — automated, auditable, beautiful.
        </p>

        <div className="hero-ctas">
          <Link href="/" className="hero-cta-primary">
            🚀 Start for Free
          </Link>
          <a href="#features" className="hero-cta-secondary">
            ▶ See Features
          </a>
        </div>

        {/* DASHBOARD MOCKUP */}
        <div className="hero-mockup-wrap">
          <div className="mockup-glow" />
          <div className="mockup-frame">
            <div className="mockup-topbar">
              <div className="mock-dot" style={{ background: "#ff5f57" }} />
              <div className="mock-dot" style={{ background: "#ffbd2e" }} />
              <div className="mock-dot" style={{ background: "#28ca41" }} />
            </div>
            <div className="mockup-body">
              {/* Sidebar */}
              <div className="mock-sidebar">
                <div className="mock-brand">
                  <div className="mock-brand-icon">🎓</div>
                  Dr. Campus
                </div>
                {[
                  { icon: "📊", label: "Dashboard", active: true },
                  { icon: "🏫", label: "Classes" },
                  { icon: "📚", label: "Subjects" },
                  { icon: "👥", label: "Students" },
                  { icon: "📅", label: "Attendance" },
                  { icon: "📈", label: "Reports" },
                  { icon: "⚙️", label: "Settings" },
                ].map((item) => (
                  <div key={item.label} className={`mock-nav-item${item.active ? " active" : ""}`}>
                    <span>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main */}
              <div className="mock-main">
                <div className="mock-header-row">
                  <div>
                    <div className="mock-title">Dashboard</div>
                    <div className="mock-subtitle">Academic Overview — Semester 5 · 2026-2027</div>
                  </div>
                  <div className="mock-pill">+ New Session</div>
                </div>

                <div className="mock-stats-row">
                  <div className="mock-stat">
                    <div className="mock-stat-val">{demoStat.students}</div>
                    <div className="mock-stat-label">Students</div>
                  </div>
                  <div className="mock-stat">
                    <div className="mock-stat-val">{demoStat.subjects}</div>
                    <div className="mock-stat-label">Subjects</div>
                  </div>
                  <div className="mock-stat">
                    <div className="mock-stat-val">{demoStat.teachers}</div>
                    <div className="mock-stat-label">Teachers</div>
                  </div>
                  <div className="mock-stat">
                    <div className="mock-stat-val" style={{ color: "#34d399" }}>94%</div>
                    <div className="mock-stat-label">Avg. Attendance</div>
                  </div>
                </div>

                <div className="mock-cards-row">
                  {[
                    { icon: "🗄️", bg: "rgba(99,102,241,0.15)", title: "DBMS", sub: "CS501 · CSE-A · 38 students", pct: 92 },
                    { icon: "⚙️", bg: "rgba(234,179,8,0.15)", title: "Operating Systems", sub: "CS502 · CSE-B · 35 students", pct: 87 },
                    { icon: "🌐", bg: "rgba(5,150,105,0.15)", title: "Computer Networks", sub: "CS503 · CSE-A · 38 students", pct: 96 },
                  ].map((c) => (
                    <div className="mock-card" key={c.title}>
                      <div className="mock-card-header">
                        <div className="mock-card-icon" style={{ background: c.bg }}>{c.icon}</div>
                        <div>
                          <div className="mock-card-title">{c.title}</div>
                          <div className="mock-card-sub">{c.sub}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: "auto" }}>{c.pct}% attendance</div>
                      <div className="mock-bar-track">
                        <div className="mock-bar-fill" style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <div className="stats-band">
        <div className="stats-band-inner">
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div className="stat-item-icon">{s.icon}</div>
              <div className="stat-item-val">{s.value}</div>
              <div className="stat-item-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* FEATURES */}
      <section className="lp-section" id="features">
        <div className="lp-section-label">FEATURES</div>
        <h2 className="lp-section-title">Everything your campus needs.</h2>
        <p className="lp-section-sub">
          From AI attendance to student portals, Dr. Campus replaces a dozen disconnected spreadsheets with one intelligent system.
        </p>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="feat-card"
              style={{ "--feat-color": f.color } as any}
            >
              <div className="feat-icon" style={{ background: f.bg }}>
                {f.icon}
              </div>
              <div
                className="feat-tag"
                style={{ color: f.color, background: f.bg, borderColor: `${f.color}30` }}
              >
                {f.tag}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="lp-divider" />

      {/* HOW IT WORKS */}
      <section className="lp-section" id="how-it-works">
        <div className="lp-section-label">HOW IT WORKS</div>
        <h2 className="lp-section-title">Up and running in one afternoon.</h2>
        <p className="lp-section-sub">
          Four simple steps — and your entire institution is live.
        </p>
        <div className="workflow-grid">
          {WORKFLOW_STEPS.map((w) => (
            <div className="workflow-step" key={w.step}>
              <div className="workflow-step-icon">{w.icon}</div>
              <div className="workflow-step-num">STEP {w.step}</div>
              <h3>{w.title}</h3>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE DEMO / ATTENDANCE CARD */}
      <div className="live-demo-section">
        <div className="live-demo-inner">
          <div className="live-demo-text">
            <div className="lp-section-label" style={{ textAlign: "left" }}>LIVE DEMO</div>
            <h2 className="live-demo-title">OCR Attendance — <br />snap, parse, done.</h2>
            <p className="live-demo-sub">
              Upload any handwritten attendance sheet. Dr. Campus reads every student code using AI-powered OCR and auto-marks Present / Absent — in under 30 seconds.
            </p>
            <div className="live-demo-counters">
              <div>
                <div className="counter-item-val">{demoStat.students.toLocaleString()}</div>
                <div className="counter-item-label">Students Tracked</div>
              </div>
              <div>
                <div className="counter-item-val">{demoStat.subjects}</div>
                <div className="counter-item-label">Active Subjects</div>
              </div>
              <div>
                <div className="counter-item-val">{demoStat.teachers}</div>
                <div className="counter-item-label">Teachers</div>
              </div>
            </div>
          </div>
          <div className="live-demo-visual">
            <div className="attendance-card-demo">
              <div className="att-header">
                <div>
                  <div className="att-title">Attendance — DBMS (CS501)</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>CSE-A · Monday 10:00–11:00 · Room 204</div>
                </div>
                <div className="att-badge">✅ Session Active</div>
              </div>
              {[
                { init: "AP", name: "Aarav Patel", id: "BCS24001", status: "P", ocr: true },
                { init: "PB", name: "Priya Bose", id: "BCS24002", status: "P", ocr: true },
                { init: "RK", name: "Rohit Kumar", id: "BCS24003", status: "A", ocr: false },
                { init: "SS", name: "Sneha Sharma", id: "BCS24004", status: "P", ocr: true },
                { init: "AM", name: "Arjun Mehta", id: "BCS24005", status: "P", ocr: true },
              ].map((s) => (
                <div className="att-row" key={s.id}>
                  <div className="att-student">
                    <div className="att-avatar">{s.init}</div>
                    <div>
                      <div className="att-name">{s.name}</div>
                      <div className="att-id">{s.id}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {s.ocr && <div className="att-ocr-tag">OCR</div>}
                    <div className={s.status === "P" ? "att-status-p" : "att-status-a"}>
                      {s.status === "P" ? "Present" : "Absent"}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(99,102,241,0.08)", borderRadius: 10, color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>
                📊 4/5 Present · 80% · 1 Absent — Save Session
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROLES */}
      <section className="lp-section" id="roles">
        <div className="lp-section-label">ROLE-BASED PORTAL</div>
        <h2 className="lp-section-title">One platform, four powerful views.</h2>
        <p className="lp-section-sub">
          Every user gets a focused, personalized dashboard — no clutter, no confusion.
        </p>
        <div className="roles-tabs">
          {ROLES.map((r, i) => (
            <button
              key={r.role}
              className={`role-tab-btn${activeRole === i ? " active" : ""}`}
              onClick={() => setActiveRole(i)}
            >
              {r.emoji} {r.role}
            </button>
          ))}
        </div>
        {ROLES.map((r, i) =>
          activeRole === i ? (
            <div
              key={r.role}
              className="role-content-card"
              style={{ background: r.bg, border: `1px solid ${r.border}` }}
            >
              <div className="role-content-inner">
                <div className="role-big-emoji">{r.emoji}</div>
                <div>
                  <h3 className="role-title" style={{ color: r.color }}>{r.role}</h3>
                  <p className="role-desc">{r.desc}</p>
                  <ul className="role-actions">
                    {r.actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null
        )}
      </section>

      <div className="lp-divider" />

      {/* TESTIMONIALS */}
      <section className="lp-section" id="testimonials">
        <div className="lp-section-label">TESTIMONIALS</div>
        <h2 className="lp-section-title">Loved by educators & students.</h2>
        <p className="lp-section-sub">
          Real voices from institutions running Dr. Campus today.
        </p>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div className="testimonial-card" key={t.name}>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: t.color }}>
                  {t.avatar}
                </div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <div className="cta-banner">
        <h2 className="cta-banner-title">Ready to modernize your campus?</h2>
        <p className="cta-banner-sub">
          Join hundreds of institutions using Dr. Campus to automate attendance, manage academic structures and empower every stakeholder.
        </p>
        <div className="cta-banner-btns">
          <Link href="/" className="cta-big-btn">
            🚀 Get Started Free
          </Link>
          <a href="#features" className="hero-cta-secondary" style={{ borderColor: "rgba(255,255,255,0.2)", color: "#c7d2fe" }}>
            Learn more →
          </a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="footer-inner">
          <div>
            <a href="#" className="lp-logo" style={{ textDecoration: "none" }}>
              <div className="lp-logo-icon">🎓</div>
              <span className="lp-logo-text">Dr. Campus</span>
            </a>
            <p className="footer-brand-desc">
              The intelligent academic management platform for universities and colleges. OCR attendance, role-based dashboards, Excel exports and full RLS security.
            </p>
            <div style={{ fontSize: "0.8rem", color: "#334155" }}>
              Built on Next.js · Supabase · PostgreSQL
            </div>
          </div>
          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#roles">Role Dashboards</a></li>
              <li><a href="#testimonials">Testimonials</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Platform</div>
            <ul className="footer-links">
              <li><a href="/">Student Portal</a></li>
              <li><a href="/">Teacher Workspace</a></li>
              <li><a href="/">Coordinator Tools</a></li>
              <li><a href="/">Admin Control</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Resources</div>
            <ul className="footer-links">
              <li><a href="#">Documentation</a></li>
              <li><a href="#">API Reference</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Support</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 Dr. Campus. All rights reserved.</div>
          <div className="footer-bottom-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
