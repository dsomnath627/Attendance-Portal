"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import * as XLSX from "xlsx";
import {
  Briefcase,
  Building2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Users,
  FileSpreadsheet,
  BarChart3,
  X,
  MessageSquare,
  ExternalLink,
  Globe,
  MapPin,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Archive,
  Send,
  Tag,
  Zap,
  Star,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  Filter,
  RefreshCw,
  Copy,
  GraduationCap,
  Check,
  ShieldCheck,
  Award,
  Layers,
  History,
  FileText,
  Sliders,
  CheckSquare,
  Square,
  ListOrdered,
} from "lucide-react";
import type { Opportunity, Application } from "./CareerStudentView";

/* ============================================================
   TYPES
============================================================ */

export type OpportunityStatus = "draft" | "published" | "open" | "closed" | "archived";

export type CustomQuestion = {
  id: string;
  question: string;
  required: boolean;
};

export type ExtendedOpportunity = Opportunity & {
  company_website?: string | null;
  company_description?: string | null;
  duration?: string | null;
  stipend?: string | null;
  ctc?: string | null;
  min_marks_10th?: number;
  min_marks_12th?: number;
  allow_backlogs?: boolean;
  max_backlogs?: number;
  mandatory_skills?: string[];
  preferred_skills?: string[];
  custom_questions?: CustomQuestion[];
  recruitment_rounds?: string[];
  created_by_profile?: { full_name: string; email: string };
};

type OppFormData = {
  /* Company */
  company_name: string;
  company_logo_url: string;
  company_website: string;
  company_description: string;
  /* Role */
  title: string;
  type: "internship" | "full_time" | "part_time" | "contract";
  description: string;
  /* Location & Mode */
  location: string;
  workplace_type: "on_site" | "remote" | "hybrid";
  /* Duration & Compensation */
  duration: string;
  stipend: string;
  ctc: string;
  salary_range: string;
  /* Deadline */
  deadline: string;
  /* Eligibility */
  target_departments: string[];
  target_batches: string[];
  min_cgpa: number;
  min_attendance: number;
  min_marks_10th: number;
  min_marks_12th: number;
  allow_backlogs: boolean;
  max_backlogs: number;
  /* Skills */
  mandatory_skills: string[];
  preferred_skills: string[];
  /* Requirements text */
  requirements: string;
  /* Status */
  status: OpportunityStatus;
  /* Custom Questions & Recruitment Pipeline */
  custom_questions: CustomQuestion[];
  recruitment_rounds: string[];
};

const DEFAULT_FORM: OppFormData = {
  company_name: "",
  company_logo_url: "",
  company_website: "",
  company_description: "",
  title: "",
  type: "internship",
  description: "",
  location: "",
  workplace_type: "on_site",
  duration: "",
  stipend: "",
  ctc: "",
  salary_range: "",
  deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  target_departments: [],
  target_batches: [],
  min_cgpa: 0,
  min_attendance: 0,
  min_marks_10th: 0,
  min_marks_12th: 0,
  allow_backlogs: true,
  max_backlogs: 0,
  mandatory_skills: [],
  preferred_skills: [],
  requirements: "",
  status: "draft",
  custom_questions: [],
  recruitment_rounds: ["Application Review", "Online Assessment", "Technical Interview", "HR Interview"],
};

/* ============================================================
   STATUS CONFIG
============================================================ */

const STATUS_CONFIG: Record<
  OpportunityStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    color: "#92400e",
    bg: "#fef3c7",
    icon: <EyeOff size={12} />,
  },
  published: {
    label: "Published",
    color: "#166534",
    bg: "#dcfce7",
    icon: <Eye size={12} />,
  },
  open: {
    label: "Open",
    color: "#166534",
    bg: "#dcfce7",
    icon: <Unlock size={12} />,
  },
  closed: {
    label: "Closed",
    color: "#1e40af",
    bg: "#dbeafe",
    icon: <Lock size={12} />,
  },
  archived: {
    label: "Archived",
    color: "#6b7280",
    bg: "#f3f4f6",
    icon: <Archive size={12} />,
  },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  internship:  { label: "Internship",  color: "#92400e", bg: "#fef3c7" },
  full_time:   { label: "Full Time",   color: "#1e40af", bg: "#dbeafe" },
  part_time:   { label: "Part Time",   color: "#6d28d9", bg: "#f3e8ff" },
  contract:    { label: "Contract",    color: "#065f46", bg: "#d1fae5" },
};

export const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  applied:     { label: "Applied",     color: "#374151", bg: "#f3f4f6", border: "#d1d5db" },
  screening:   { label: "Screening",   color: "#6d28d9", bg: "#ede9fe", border: "#c4b5fd" },
  shortlisted: { label: "Shortlisted", color: "#0369a1", bg: "#e0f2fe", border: "#7dd3fc" },
  assessment:  { label: "Assessment",  color: "#4338ca", bg: "#e0e7ff", border: "#a5b4fc" },
  interview:   { label: "Interview",   color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
  waitlisted:  { label: "Waitlisted",  color: "#c2410c", bg: "#ffedd5", border: "#fed7aa" },
  offered:     { label: "Offered",     color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  rejected:    { label: "Rejected",    color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" },
  withdrawn:   { label: "Withdrawn",   color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
};

export const ELIGIBILITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  eligible:     { label: "Eligible",     color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  needs_review: { label: "Needs Review", color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
  not_eligible: { label: "Not Eligible", color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" },
};

/* ============================================================
   SECTION HEADER COMPONENT
============================================================ */
function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "20px" }}>
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: "var(--theme-primary, #111827)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   BADGE COMPONENT
============================================================ */
function Badge({
  color,
  bg,
  children,
}: {
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 700,
        color,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================
   SKILL TAG EDITOR
============================================================ */
function SkillTagEditor({
  label,
  tags,
  onChange,
  placeholder,
  color = "#3b82f6",
  bg = "#eff6ff",
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  color?: string;
  bg?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const t = input.trim();
    if (!t || tags.includes(t)) { setInput(""); return; }
    onChange([...tags, t]);
    setInput("");
  }

  return (
    <div>
      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#344054" }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          style={{ flex: 1 }}
        />
        <button type="button" className="secondary-btn" onClick={add}
          style={{ padding: "0 14px", whiteSpace: "nowrap" }}>
          + Add
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", minHeight: "30px" }}>
        {tags.length === 0 && (
          <span style={{ fontSize: "12px", color: "#94a3b8", padding: "4px 0" }}>No tags added</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "4px 10px", borderRadius: "20px", fontSize: "12px",
              fontWeight: 600, color, background: bg, border: `1px solid ${color}30`,
            }}
          >
            {tag}
            <X size={12} style={{ cursor: "pointer", opacity: 0.6 }}
              onClick={() => onChange(tags.filter((t) => t !== tag))} />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   CUSTOM QUESTIONS EDITOR
============================================================ */
function CustomQuestionsEditor({
  questions,
  onChange,
}: {
  questions: CustomQuestion[];
  onChange: (q: CustomQuestion[]) => void;
}) {
  function addQ() {
    onChange([
      ...questions,
      { id: Math.random().toString(36).slice(2), question: "", required: false },
    ]);
  }

  function removeQ(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }

  function updateQ(id: string, field: keyof CustomQuestion, value: any) {
    onChange(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {questions.length === 0 && (
          <div
            style={{
              textAlign: "center", padding: "20px 16px", background: "#f8fafc",
              borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#94a3b8", fontSize: "13px",
            }}
          >
            No custom questions yet. Add a question to gather specific info from applicants.
          </div>
        )}
        {questions.map((q, idx) => (
          <div
            key={q.id}
            style={{
              padding: "14px 16px", borderRadius: "10px", background: "#f8fafc",
              border: "1px solid #e2e8f0", display: "flex", gap: "12px", alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "26px", height: "26px", borderRadius: "50%", background: "#e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700, color: "#64748b", flexShrink: 0,
              }}
            >
              {idx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="e.g. Why are you interested in this role?"
                value={q.question}
                onChange={(e) => updateQ(q.id, "question", e.target.value)}
                style={{ marginBottom: "8px" }}
              />
              <label
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  fontSize: "12px", fontWeight: 600, color: "#64748b", cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => updateQ(q.id, "required", e.target.checked)}
                  style={{ width: "auto" }}
                />
                Required question
              </label>
            </div>
            <button
              type="button"
              onClick={() => removeQ(q.id)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "#ef4444", padding: "2px",
              }}
              title="Remove"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="secondary-btn"
        onClick={addQ}
        style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
      >
        <Plus size={14} /> Add Application Question
      </button>
    </div>
  );
}

/* ============================================================
   RECRUITMENT ROUNDS EDITOR
============================================================ */
function RecruitmentRoundsEditor({
  rounds,
  onChange,
}: {
  rounds: string[];
  onChange: (rounds: string[]) => void;
}) {
  const [newRound, setNewRound] = useState("");

  function addRound() {
    const r = newRound.trim();
    if (!r || rounds.includes(r)) {
      setNewRound("");
      return;
    }
    onChange([...rounds, r]);
    setNewRound("");
  }

  function removeRound(idx: number) {
    onChange(rounds.filter((_, i) => i !== idx));
  }

  function moveRound(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= rounds.length) return;
    const copy = [...rounds];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    onChange(copy);
  }

  return (
    <div>
      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#344054" }}>
        Recruitment Rounds &amp; Selection Pipeline
      </label>
      <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b" }}>
        Define the interview / evaluation stages. Coordinators can record scores, notes and advance candidates through each round.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
        {rounds.map((roundName, idx) => (
          <div
            key={idx}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#4f46e5",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{roundName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => moveRound(idx, -1)}
                style={{
                  background: "transparent",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  cursor: idx === 0 ? "not-allowed" : "pointer",
                  color: idx === 0 ? "#cbd5e1" : "#475569",
                  padding: "3px 7px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                ▲
              </button>
              <button
                type="button"
                disabled={idx === rounds.length - 1}
                onClick={() => moveRound(idx, 1)}
                style={{
                  background: "transparent",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  cursor: idx === rounds.length - 1 ? "not-allowed" : "pointer",
                  color: idx === rounds.length - 1 ? "#cbd5e1" : "#475569",
                  padding: "3px 7px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => removeRound(idx)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#ef4444",
                  padding: "4px",
                }}
                title="Remove Round"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          placeholder="e.g. Coding Assessment, Technical Interview, HR Round"
          value={newRound}
          onChange={(e) => setNewRound(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRound(); } }}
          style={{ flex: 1, padding: "8px 12px", fontSize: "13px" }}
        />
        <button
          type="button"
          className="secondary-btn"
          onClick={addRound}
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
        >
          <Plus size={14} /> Add Round
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   OPPORTUNITY CARD COMPONENT
============================================================ */
function OpportunityCard({
  opp,
  appCount,
  departments,
  batches,
  isCoordinator,
  onEdit,
  onDelete,
  onStatusChange,
  onViewApplicants,
}: {
  opp: ExtendedOpportunity;
  appCount: number;
  departments: Array<{ id: string; name: string }>;
  batches: Array<{ id: string; name: string; department_id: string }>;
  isCoordinator: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: OpportunityStatus) => void;
  onViewApplicants: () => void;
}) {
  const statusCfg = STATUS_CONFIG[opp.status as OpportunityStatus] ?? STATUS_CONFIG.draft;
  const typeCfg = TYPE_CONFIG[opp.type] ?? TYPE_CONFIG.full_time;
  const isExpired = new Date(opp.deadline).getTime() < Date.now();
  const daysLeft = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000);

  const targetDeptNames = (opp.target_departments || [])
    .map((id) => departments.find((d) => d.id === id)?.name)
    .filter(Boolean);

  const nextStatuses: OpportunityStatus[] =
    opp.status === "draft"
      ? ["published"]
      : opp.status === "published" || opp.status === "open"
      ? ["closed", "archived"]
      : opp.status === "closed"
      ? ["published", "archived"]
      : ["draft"];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.15s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Card Top Strip */}
      <div
        style={{
          height: "4px",
          background:
            opp.status === "published" || opp.status === "open"
              ? "#22c55e"
              : opp.status === "draft"
              ? "#f59e0b"
              : opp.status === "closed"
              ? "#3b82f6"
              : "#9ca3af",
        }}
      />

      <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Company + Badges Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1, minWidth: 0 }}>
            {/* Logo / Initials */}
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "linear-gradient(135deg, #1e293b, #334155)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", fontWeight: 800, flexShrink: 0,
              }}
            >
              {opp.company_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opp.company_logo_url}
                  alt={opp.company_name}
                  style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "12px" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                opp.company_name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700, fontSize: "15px", color: "#0f172a",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {opp.title}
              </div>
              <div style={{ fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                {opp.company_name}
                {opp.company_website && (
                  <a
                    href={opp.company_website}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#3b82f6", display: "inline-flex" }}
                    title="Company website"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end", flexShrink: 0 }}>
            <Badge color={statusCfg.color} bg={statusCfg.bg}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
            <Badge color={typeCfg.color} bg={typeCfg.bg}>
              {typeCfg.label}
            </Badge>
          </div>
        </div>

        {/* Key Info Grid */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
            padding: "12px", background: "#f8fafc", borderRadius: "10px",
            marginBottom: "14px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
            <MapPin size={12} />
            <span>{opp.location} &bull; {(opp.workplace_type || "on_site").replace("_", "-")}</span>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
            <Clock size={12} />
            <span
              style={{ color: isExpired ? "#ef4444" : daysLeft <= 3 ? "#f59e0b" : "#64748b", fontWeight: isExpired || daysLeft <= 3 ? 600 : 400 }}
            >
              {isExpired ? "Expired" : daysLeft === 0 ? "Ends Today" : `${daysLeft}d left`}
            </span>
          </div>
          {(opp.ctc || opp.stipend) && (
            <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
              <span>₹</span>
              <span>{opp.ctc || opp.stipend}</span>
            </div>
          )}
          {opp.duration && (
            <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
              <Briefcase size={12} />
              <span>{opp.duration}</span>
            </div>
          )}
        </div>

        {/* Eligibility Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
          {opp.min_cgpa && opp.min_cgpa > 0 ? (
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "#ede9fe", color: "#6d28d9", fontWeight: 600 }}>
              CGPA ≥ {opp.min_cgpa}
            </span>
          ) : null}
          {opp.min_marks_10th && opp.min_marks_10th > 0 ? (
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>
              10th ≥ {opp.min_marks_10th}%
            </span>
          ) : null}
          {opp.min_marks_12th && opp.min_marks_12th > 0 ? (
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>
              12th ≥ {opp.min_marks_12th}%
            </span>
          ) : null}
          {opp.allow_backlogs === false ? (
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "#fee2e2", color: "#b91c1c", fontWeight: 600 }}>
              No Backlogs
            </span>
          ) : opp.max_backlogs && opp.max_backlogs > 0 ? (
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "#fee2e2", color: "#b91c1c", fontWeight: 600 }}>
              Max {opp.max_backlogs} Backlog(s)
            </span>
          ) : null}
          {targetDeptNames.length > 0 && (
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}>
              {targetDeptNames.length === 1 ? targetDeptNames[0] : `${targetDeptNames.length} Depts`}
            </span>
          )}
        </div>

        {/* Skills Preview */}
        {((opp.mandatory_skills?.length ?? 0) > 0 || (opp.preferred_skills?.length ?? 0) > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "14px" }}>
            {(opp.mandatory_skills || []).slice(0, 3).map((s) => (
              <span
                key={s}
                style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "#1e293b", color: "#fff", fontWeight: 600 }}
              >
                {s}
              </span>
            ))}
            {(opp.preferred_skills || []).slice(0, 2).map((s) => (
              <span
                key={s}
                style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: "#f1f5f9", color: "#475569", fontWeight: 500 }}
              >
                {s}
              </span>
            ))}
            {((opp.mandatory_skills?.length ?? 0) + (opp.preferred_skills?.length ?? 0)) > 5 && (
              <span style={{ fontSize: "11px", color: "#94a3b8", padding: "2px 4px" }}>
                +{(opp.mandatory_skills?.length ?? 0) + (opp.preferred_skills?.length ?? 0) - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div
        style={{
          borderTop: "1px solid #f1f5f9",
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          background: "#fafafa",
        }}
      >
        {/* Applicant Count */}
        <button
          onClick={onViewApplicants}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "5px",
            fontSize: "13px", color: "#64748b", fontWeight: 600, padding: 0,
          }}
        >
          <Users size={14} />
          <span style={{ color: appCount > 0 ? "#1e293b" : "#94a3b8" }}>
            {appCount} Applicant{appCount !== 1 ? "s" : ""}
          </span>
        </button>

        {/* Actions */}
        <div style={{ display: "flex", gap: "6px" }}>
          {/* Status transition */}
          {nextStatuses.length > 0 && !isCoordinator && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) onStatusChange(e.target.value as OpportunityStatus); }}
              style={{
                padding: "5px 8px", fontSize: "12px", borderRadius: "7px",
                border: "1px solid #d1d5db", cursor: "pointer", fontWeight: 600, background: "#fff",
              }}
              title="Change status"
            >
              <option value="" disabled>Move to…</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          )}
          {(!isCoordinator || opp.status === "draft") && (
            <button
              onClick={onEdit}
              style={{
                padding: "5px 10px", borderRadius: "7px", border: "1px solid #d1d5db",
                background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                fontSize: "12px", fontWeight: 600, color: "#374151",
              }}
              title="Edit"
            >
              <Edit size={13} /> Edit
            </button>
          )}
          {!isCoordinator && (
            <button
              onClick={onDelete}
              style={{
                padding: "5px 10px", borderRadius: "7px", border: "1px solid #fecaca",
                background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                fontSize: "12px", fontWeight: 600, color: "#dc2626",
              }}
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FORM SECTION BOX
============================================================ */
function FormSection({
  title,
  icon,
  children,
  accent = "#3b82f6",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "30px", height: "30px", borderRadius: "8px",
            background: accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
interface CareerAdminViewProps {
  userProfile: UserProfile;
  departments: Array<{ id: string; name: string; code: string | null }>;
  batches: Array<{ id: string; name: string; department_id: string }>;
  notify: (msg: string) => void;
  showError: (msg: string) => void;
}

export default function CareerAdminView({
  userProfile,
  departments,
  batches,
  notify,
  showError,
}: CareerAdminViewProps) {
  const isCoordinator = userProfile.role === "coordinator";

  const [activeTab, setActiveTab] = useState<"opportunities" | "ats" | "analytics" | "verification">("opportunities");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* data */
  const [opportunities, setOpportunities] = useState<ExtendedOpportunity[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  /* coordinator's allowed dept IDs */
  const [myDeptIds, setMyDeptIds] = useState<string[]>([]);

  /* filters */
  const [oppSearch, setOppSearch] = useState("");
  const [oppStatusFilter, setOppStatusFilter] = useState<string>("all");
  const [oppTypeFilter, setOppTypeFilter] = useState<string>("all");

  /* ATS filters */
  const [atsOppFilter, setAtsOppFilter] = useState("all");
  const [atsStatusFilter, setAtsStatusFilter] = useState("all");
  const [atsEligibilityFilter, setAtsEligibilityFilter] = useState("all");
  const [atsDeptFilter, setAtsDeptFilter] = useState("all");
  const [atsBatchFilter, setAtsBatchFilter] = useState("all");
  const [atsSearch, setAtsSearch] = useState("");
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  /* candidate details modal */
  const [candidateApp, setCandidateApp] = useState<any | null>(null);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [candidateModalTab, setCandidateModalTab] = useState<"overview" | "snapshot" | "history">("overview");
  const [candidateAuditHistory, setCandidateAuditHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /* round / assessment modal */
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [activeRoundApp, setActiveRoundApp] = useState<any | null>(null);
  const [roundForm, setRoundForm] = useState({
    round_name: "",
    score: "",
    to_status: "assessment",
    notes: "",
    is_bulk: false,
  });

  /* verification & sgpa */
  const [verificationProfiles, setVerificationProfiles] = useState<any[]>([]);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [verificationSearch, setVerificationSearch] = useState("");

  /* sgpa manager */
  const [selectedStudentForSgpa, setSelectedStudentForSgpa] = useState<any | null>(null);
  const [sgpaRecords, setSgpaRecords] = useState<any[]>([]);
  const [sgpaForm, setSgpaForm] = useState({
    semester_no: 1,
    semester_name: "Semester 1",
    sgpa: "",
    cgpa: "",
    backlogs: "0",
  });
  const [savingSgpa, setSavingSgpa] = useState(false);
  const [sgpaSearchStudent, setSgpaSearchStudent] = useState("");
  const [allStudents, setAllStudents] = useState<any[]>([]);

  /* form modal */
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OppFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formSection, setFormSection] = useState<"company" | "role" | "eligibility" | "skills" | "questions">("company");

  /* feedback modal */
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [activeApp, setActiveApp] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");

  /* ats view driven from card */
  const [atsOppView, setAtsOppView] = useState<string>("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    await Promise.all([loadOpportunities(), loadApplications(), loadMyDepts(), loadVerificationData()]);
    setLoading(false);
  }

  async function loadVerificationData() {
    setVerificationLoading(true);
    try {
      const { data: profs, error } = await supabase
        .from("student_career_profiles")
        .select(`
          id, profile_id, student_id,
          marks_10th, marks_10th_verified,
          marks_12th, marks_12th_verified,
          active_backlogs, total_backlogs, backlogs_verified,
          technical_skills, soft_skills,
          profiles:profile_id(id, full_name, email),
          students:student_id(id, student_id, name, department_id, batch_id)
        `);

      if (!error && profs) {
        setVerificationProfiles(profs);
      }

      const { data: studs } = await supabase
        .from("students")
        .select("id, student_id, name, department_id, batch_id")
        .order("name");
      if (studs) setAllStudents(studs);
    } catch (e: any) {
      console.warn("Verification load:", e.message);
    } finally {
      setVerificationLoading(false);
    }
  }

  async function verifyField(profileRowId: string, field: "marks_10th" | "marks_12th" | "backlogs" | "all") {
    try {
      const updatePayload: any = {};
      if (field === "marks_10th" || field === "all") updatePayload.marks_10th_verified = true;
      if (field === "marks_12th" || field === "all") updatePayload.marks_12th_verified = true;
      if (field === "backlogs" || field === "all") updatePayload.backlogs_verified = true;

      const { error } = await supabase
        .from("student_career_profiles")
        .update(updatePayload)
        .eq("id", profileRowId);

      if (error) throw error;
      notify("Verification status updated!");
      setVerificationProfiles((prev) =>
        prev.map((p) => (p.id === profileRowId ? { ...p, ...updatePayload } : p))
      );
    } catch (err: any) {
      showError(err.message || "Failed to update verification");
    }
  }

  async function loadStudentSgpa(student: any) {
    setSelectedStudentForSgpa(student);
    const { data, error } = await supabase
      .from("student_sgpa_records")
      .select("*")
      .eq("student_id", student.id)
      .order("semester_no", { ascending: true });
    if (!error && data) {
      setSgpaRecords(data);
    } else {
      setSgpaRecords([]);
    }
  }

  async function saveSgpaRecord() {
    if (!selectedStudentForSgpa) return;
    const sgpaVal = parseFloat(sgpaForm.sgpa);
    if (isNaN(sgpaVal) || sgpaVal < 0 || sgpaVal > 10) {
      showError("Please enter a valid SGPA between 0.0 and 10.0");
      return;
    }
    setSavingSgpa(true);
    try {
      const payload = {
        student_id: selectedStudentForSgpa.id,
        semester_no: Number(sgpaForm.semester_no),
        semester_name: sgpaForm.semester_name || `Semester ${sgpaForm.semester_no}`,
        sgpa: sgpaVal,
        cgpa: sgpaForm.cgpa ? parseFloat(sgpaForm.cgpa) : sgpaVal,
        backlogs: parseInt(sgpaForm.backlogs) || 0,
      };

      const { error } = await supabase
        .from("student_sgpa_records")
        .upsert(payload, { onConflict: "student_id,semester_no" });

      if (error) throw error;
      notify(`Semester ${payload.semester_no} record saved!`);
      loadStudentSgpa(selectedStudentForSgpa);
      setSgpaForm((prev) => ({
        ...prev,
        semester_no: Math.min(8, prev.semester_no + 1),
        semester_name: `Semester ${Math.min(8, prev.semester_no + 1)}`,
        sgpa: "",
        cgpa: "",
        backlogs: "0",
      }));
    } catch (err: any) {
      showError(err.message || "Failed to save SGPA record");
    } finally {
      setSavingSgpa(false);
    }
  }

  async function deleteSgpaRecord(id: string) {
    if (!window.confirm("Delete this semester record?")) return;
    try {
      const { error } = await supabase.from("student_sgpa_records").delete().eq("id", id);
      if (error) throw error;
      notify("Grade record removed");
      setSgpaRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      showError(err.message || "Failed to delete record");
    }
  }

  async function loadMyDepts() {
    if (!isCoordinator) return;
    const { data } = await supabase
      .from("coordinator_departments")
      .select("department_id")
      .eq("coordinator_id", userProfile.id);
    if (data) setMyDeptIds(data.map((d: any) => d.department_id));
  }

  async function loadOpportunities() {
    const q = supabase
      .from("career_opportunities")
      .select("*, profiles:created_by(full_name, email)")
      .order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) { console.warn("Ops load:", error.message); }
    else if (data) {
      setOpportunities(
        data.map((o: any) => ({
          ...o,
          mandatory_skills: o.mandatory_skills ?? [],
          preferred_skills: o.preferred_skills ?? [],
          custom_questions: o.custom_questions ?? [],
          target_departments: o.target_departments ?? [],
          target_batches: o.target_batches ?? [],
        }))
      );
    }
  }

  async function loadApplications() {
    const { data, error } = await supabase
      .from("career_applications")
      .select(`
        id, opportunity_id, student_profile_id, student_id,
        resume_url, cover_letter, status, feedback, applied_at,
        custom_answers, cv_version_id, eligibility_status, eligibility_reasons,
        profile_snapshot, current_round, round_scores, withdrawn_at, withdrawal_reason,
        career_opportunities(id, title, company_name, type, recruitment_rounds, custom_questions),
        profiles:student_profile_id(id, full_name, email),
        students:student_id(id, student_id, name, department_id, batch_id)
      `)
      .order("applied_at", { ascending: false });
    if (error) { console.warn("Apps load:", error.message); }
    else if (data) setApplications(data);
  }

  async function loadAppHistory(appId: string) {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("career_application_history")
        .select("*, profiles:changed_by(full_name, email)")
        .eq("application_id", appId)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setCandidateAuditHistory(data);
      } else {
        setCandidateAuditHistory([]);
      }
    } catch (e: any) {
      console.warn("History load error:", e.message);
      setCandidateAuditHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  function openCandidateModal(app: any) {
    setCandidateApp(app);
    setCandidateModalTab("overview");
    setCandidateModalOpen(true);
    loadAppHistory(app.id);
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    notify("Data refreshed");
  }

  /* ---- OPPORTUNITY CRUD ---- */

  function openCreate() {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
    setFormSection("company");
    setFormOpen(true);
  }

  function openEdit(opp: ExtendedOpportunity) {
    setEditingId(opp.id);
    setForm({
      company_name: opp.company_name,
      company_logo_url: opp.company_logo_url ?? "",
      company_website: opp.company_website ?? "",
      company_description: opp.company_description ?? "",
      title: opp.title,
      type: opp.type,
      description: opp.description,
      location: opp.location,
      workplace_type: opp.workplace_type,
      duration: opp.duration ?? "",
      stipend: opp.stipend ?? "",
      ctc: opp.ctc ?? "",
      salary_range: opp.salary_range ?? "",
      deadline: opp.deadline?.slice(0, 10) ?? "",
      target_departments: opp.target_departments ?? [],
      target_batches: opp.target_batches ?? [],
      min_cgpa: opp.min_cgpa ?? 0,
      min_attendance: opp.min_attendance ?? 0,
      min_marks_10th: opp.min_marks_10th ?? 0,
      min_marks_12th: opp.min_marks_12th ?? 0,
      allow_backlogs: opp.allow_backlogs ?? true,
      max_backlogs: opp.max_backlogs ?? 0,
      mandatory_skills: opp.mandatory_skills ?? [],
      preferred_skills: opp.preferred_skills ?? [],
      requirements: opp.requirements ?? "",
      status: (opp.status as OpportunityStatus) ?? "draft",
      custom_questions: opp.custom_questions ?? [],
      recruitment_rounds: opp.recruitment_rounds ?? [
        "Application Review",
        "Online Assessment",
        "Technical Interview",
        "HR Interview",
      ],
    });
    setFormSection("company");
    setFormOpen(true);
  }

  async function saveOpp(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) { showError("Company name is required"); return; }
    if (!form.title.trim()) { showError("Job title is required"); return; }
    if (!form.description.trim()) { showError("Job description is required"); return; }
    if (!form.deadline) { showError("Application deadline is required"); return; }

    setSaving(true);
    try {
      const payload: any = {
        created_by: userProfile.id,
        company_name: form.company_name.trim(),
        company_logo_url: form.company_logo_url.trim() || null,
        company_website: form.company_website.trim() || null,
        company_description: form.company_description.trim() || null,
        title: form.title.trim(),
        type: form.type,
        description: form.description.trim(),
        location: form.location.trim() || "India",
        workplace_type: form.workplace_type,
        duration: form.duration.trim() || null,
        stipend: form.stipend.trim() || null,
        ctc: form.ctc.trim() || null,
        salary_range: form.salary_range.trim() || null,
        deadline: new Date(form.deadline).toISOString(),
        target_departments: form.target_departments,
        target_batches: form.target_batches,
        min_cgpa: Number(form.min_cgpa) || 0,
        min_attendance: Number(form.min_attendance) || 0,
        min_marks_10th: Number(form.min_marks_10th) || 0,
        min_marks_12th: Number(form.min_marks_12th) || 0,
        allow_backlogs: form.allow_backlogs,
        max_backlogs: form.allow_backlogs ? Number(form.max_backlogs) : 0,
        mandatory_skills: form.mandatory_skills,
        preferred_skills: form.preferred_skills,
        requirements: form.requirements.trim() || null,
        status: form.status,
        custom_questions: form.custom_questions,
        recruitment_rounds: form.recruitment_rounds?.length
          ? form.recruitment_rounds
          : ["Application Review", "Online Assessment", "Technical Interview", "HR Interview"],
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { data, error } = await supabase
          .from("career_opportunities")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single();
        if (error) throw error;
        setOpportunities((prev) => prev.map((o) => (o.id === editingId ? { ...o, ...data } : o)));
        notify(`"${form.title}" updated successfully`);
      } else {
        const { data, error } = await supabase
          .from("career_opportunities")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setOpportunities((prev) => [{ ...data, mandatory_skills: [], preferred_skills: [], custom_questions: [], target_departments: [], target_batches: [] }, ...prev]);
        notify(`"${form.title}" posted successfully`);
      }
      setFormOpen(false);
    } catch (err: any) {
      showError(err.message || "Failed to save opportunity");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOpp(id: string, title: string) {
    if (!window.confirm(`Delete "${title}" and all its applications? This cannot be undone.`)) return;
    const { error } = await supabase.from("career_opportunities").delete().eq("id", id);
    if (error) { showError(error.message); return; }
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
    setApplications((prev) => prev.filter((a) => a.opportunity_id !== id));
    notify("Opportunity deleted");
  }

  async function changeStatus(opp: ExtendedOpportunity, status: OpportunityStatus) {
    const { error } = await supabase
      .from("career_opportunities")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", opp.id);
    if (error) { showError(error.message); return; }
    setOpportunities((prev) => prev.map((o) => (o.id === opp.id ? { ...o, status } : o)));
    notify(`Status changed to ${STATUS_CONFIG[status].label}`);
  }

  /* ---- ATS (STAGE 6 RECRUITMENT MANAGEMENT) ---- */

  async function updateCandidateStatus(
    appId: string,
    toStatus: string,
    roundName?: string,
    score?: number,
    notes?: string
  ) {
    const targetApp = applications.find((a) => a.id === appId);
    const fromStatus = targetApp?.status || "applied";
    const now = new Date().toISOString();

    const updatePayload: any = {
      status: toStatus,
      updated_at: now,
    };
    if (roundName) {
      updatePayload.current_round = roundName;
    }
    if (roundName && score !== undefined && !isNaN(score)) {
      const existingScores = targetApp?.round_scores || {};
      updatePayload.round_scores = {
        ...existingScores,
        [roundName]: {
          score: Number(score),
          notes: notes || null,
          recorded_at: now,
          recorded_by: userProfile.id,
        },
      };
    }
    if (notes) {
      updatePayload.feedback = notes;
    }

    const { error: appErr } = await supabase
      .from("career_applications")
      .update(updatePayload)
      .eq("id", appId);

    if (appErr) {
      showError(appErr.message);
      return;
    }

    try {
      await supabase.from("career_application_history").insert({
        application_id: appId,
        changed_by: userProfile.id,
        from_status: fromStatus,
        to_status: toStatus,
        round_name: roundName || null,
        score: score !== undefined && !isNaN(score) ? Number(score) : null,
        notes: notes || null,
      });
    } catch (e: any) {
      console.warn("Audit history insert error:", e.message);
    }

    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, ...updatePayload } : a))
    );

    if (candidateApp && candidateApp.id === appId) {
      setCandidateApp((prev: any) => ({ ...prev, ...updatePayload }));
      loadAppHistory(appId);
    }
    notify(`Candidate moved to ${STAGE_CONFIG[toStatus]?.label || toStatus}`);
  }

  async function bulkUpdateStatus(
    toStatus: string,
    roundName?: string,
    score?: number,
    notes?: string
  ) {
    if (selectedAppIds.length === 0) return;
    const count = selectedAppIds.length;
    const now = new Date().toISOString();

    try {
      for (const appId of selectedAppIds) {
        const targetApp = applications.find((a) => a.id === appId);
        const fromStatus = targetApp?.status || "applied";

        const updatePayload: any = {
          status: toStatus,
          updated_at: now,
        };
        if (roundName) updatePayload.current_round = roundName;
        if (roundName && score !== undefined && !isNaN(score)) {
          const existingScores = targetApp?.round_scores || {};
          updatePayload.round_scores = {
            ...existingScores,
            [roundName]: {
              score: Number(score),
              notes: notes || null,
              recorded_at: now,
              recorded_by: userProfile.id,
            },
          };
        }
        if (notes) updatePayload.feedback = notes;

        await supabase.from("career_applications").update(updatePayload).eq("id", appId);

        try {
          await supabase.from("career_application_history").insert({
            application_id: appId,
            changed_by: userProfile.id,
            from_status: fromStatus,
            to_status: toStatus,
            round_name: roundName || null,
            score: score !== undefined && !isNaN(score) ? Number(score) : null,
            notes: notes || null,
          });
        } catch (e) {
          // ignore log fail
        }
      }

      setApplications((prev) =>
        prev.map((a) => {
          if (!selectedAppIds.includes(a.id)) return a;
          const upd: any = { status: toStatus, updated_at: now };
          if (roundName) upd.current_round = roundName;
          if (notes) upd.feedback = notes;
          return { ...a, ...upd };
        })
      );

      setSelectedAppIds([]);
      notify(`${count} candidate${count > 1 ? "s" : ""} moved to ${STAGE_CONFIG[toStatus]?.label || toStatus}`);
    } catch (err: any) {
      showError(err.message || "Failed to bulk update candidates");
    }
  }

  function openRoundModal(app?: any, isBulk = false) {
    if (isBulk && selectedAppIds.length === 0) {
      showError("Please select at least one candidate first");
      return;
    }
    const defaultRound =
      app?.career_opportunities?.recruitment_rounds?.[0] || "Online Assessment";
    setActiveRoundApp(app || null);
    setRoundForm({
      round_name: defaultRound,
      score: "",
      to_status: "assessment",
      notes: "",
      is_bulk: isBulk,
    });
    setRoundModalOpen(true);
  }

  async function submitRoundResult() {
    if (!roundForm.round_name.trim()) {
      showError("Please enter or select a round name");
      return;
    }
    const scoreNum = roundForm.score ? parseFloat(roundForm.score) : undefined;
    if (roundForm.is_bulk) {
      await bulkUpdateStatus(
        roundForm.to_status,
        roundForm.round_name.trim(),
        scoreNum,
        roundForm.notes
      );
    } else if (activeRoundApp) {
      await updateCandidateStatus(
        activeRoundApp.id,
        roundForm.to_status,
        roundForm.round_name.trim(),
        scoreNum,
        roundForm.notes
      );
    }
    setRoundModalOpen(false);
  }

  async function saveFeedback() {
    if (!activeApp) return;
    const { error } = await supabase
      .from("career_applications")
      .update({ feedback: feedbackText || null, updated_at: new Date().toISOString() })
      .eq("id", activeApp.id);
    if (error) { showError(error.message); return; }
    setApplications((prev) =>
      prev.map((a) => (a.id === activeApp.id ? { ...a, feedback: feedbackText || null } : a))
    );
    notify("Notes saved");
    setFeedbackOpen(false);
  }

  function exportXlsx() {
    const rows = filteredApps.map((app) => {
      const dept = departments.find((d) => d.id === app.students?.department_id);
      const batch = batches.find((b) => b.id === app.students?.batch_id);
      const snapshot = app.profile_snapshot || {};
      const academic = snapshot.academic || {};
      const roundScoresStr = app.round_scores
        ? Object.entries(app.round_scores)
            .map(([r, s]: [string, any]) => `${r}: ${s?.score ?? "N/A"}`)
            .join("; ")
        : "";

      return {
        "Drive": `${app.career_opportunities?.company_name || ""} — ${app.career_opportunities?.title || ""}`,
        "Student Name": app.students?.name || app.profiles?.full_name || "",
        "Roll No": app.students?.student_id || "",
        "Email": app.profiles?.email || "",
        "Department": dept?.name || academic.department_name || "",
        "Batch": batch?.name || academic.batch_name || "",
        "Eligibility Status": (app.eligibility_status || "N/A").toUpperCase(),
        "Eligibility Reasons": (app.eligibility_reasons || []).join("; "),
        "Recruitment Stage": (app.status || "").toUpperCase(),
        "Current Round": app.current_round || "",
        "Round Scores": roundScoresStr,
        "Snapshot CGPA": academic.cgpa ?? "N/A",
        "Snapshot 10th %": academic.marks_10th ?? "N/A",
        "Snapshot 12th %": academic.marks_12th ?? "N/A",
        "Snapshot Backlogs": academic.active_backlogs ?? "N/A",
        "Applied Date": app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "",
        "CV URL": app.resume_url || "",
        "Coordinator Notes": app.feedback || "",
      };
    });
    if (!rows.length) { showError("No data to export"); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applicants");
    XLSX.writeFile(wb, `Recruitment_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify("Excel exported with complete candidate metrics");
  }

  /* ---- COMPUTED ---- */

  const visibleOpps = isCoordinator
    ? opportunities.filter((o) => {
        if (o.created_by === userProfile.id) return true;
        if (!o.target_departments || o.target_departments.length === 0) return false;
        return o.target_departments.some((id) => myDeptIds.includes(id));
      })
    : opportunities;

  const filteredOpps = visibleOpps.filter((o) => {
    const q = oppSearch.toLowerCase();
    const matchQ =
      !q ||
      o.title.toLowerCase().includes(q) ||
      o.company_name.toLowerCase().includes(q) ||
      (o.location || "").toLowerCase().includes(q);
    const matchStatus = oppStatusFilter === "all" || o.status === oppStatusFilter;
    const matchType = oppTypeFilter === "all" || o.type === oppTypeFilter;
    return matchQ && matchStatus && matchType;
  });

  const filteredApps = applications.filter((a) => {
    const opp = atsOppFilter === "all" ? true : a.opportunity_id === atsOppFilter;
    const status = atsStatusFilter === "all" || a.status === atsStatusFilter;
    const eligibility = atsEligibilityFilter === "all" || a.eligibility_status === atsEligibilityFilter;
    const dept = atsDeptFilter === "all" || a.students?.department_id === atsDeptFilter;
    const batch = atsBatchFilter === "all" || a.students?.batch_id === atsBatchFilter;
    const q = atsSearch.toLowerCase();
    const matchQ =
      !q ||
      (a.students?.name || "").toLowerCase().includes(q) ||
      (a.students?.student_id || "").toLowerCase().includes(q) ||
      (a.profiles?.email || "").toLowerCase().includes(q) ||
      (a.career_opportunities?.company_name || "").toLowerCase().includes(q) ||
      (a.career_opportunities?.title || "").toLowerCase().includes(q);
    return opp && status && eligibility && dept && batch && matchQ;
  });

  const statCounts = {
    total: visibleOpps.length,
    published: visibleOpps.filter((o) => o.status === "published" || o.status === "open").length,
    draft: visibleOpps.filter((o) => o.status === "draft").length,
    apps: applications.length,
    offered: applications.filter((a) => a.status === "offered").length,
  };

  /* ---- FORM SECTION TABS ---- */

  const FORM_SECTIONS = [
    { key: "company", label: "Company", icon: <Building2 size={14} /> },
    { key: "role", label: "Role & Location", icon: <Briefcase size={14} /> },
    { key: "eligibility", label: "Eligibility", icon: <CheckCircle size={14} /> },
    { key: "skills", label: "Skills", icon: <Tag size={14} /> },
    { key: "questions", label: "Questions", icon: <MessageSquare size={14} /> },
  ] as const;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ animation: "fadeIn 0.2s ease-in-out" }}>

      {/* ── PAGE HEADER ── */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--theme-primary, #111827) 0%, #1e293b 100%)",
          borderRadius: "18px",
          padding: "28px 32px",
          marginBottom: "24px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <Briefcase size={28} />
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>
              Career &amp; Placement Management
            </h1>
          </div>
          <p style={{ margin: 0, opacity: 0.75, fontSize: "14px" }}>
            {isCoordinator
              ? "Manage placement drives for your assigned departments"
              : "Institution-wide training & placement cell dashboard"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{
              padding: "10px 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600,
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {!isCoordinator && (
            <button
              onClick={openCreate}
              style={{
                padding: "10px 20px", borderRadius: "10px", border: "none",
                background: "#fff", color: "#111827", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700,
              }}
            >
              <Plus size={15} /> Post New Drive
            </button>
          )}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: "Total Drives", value: statCounts.total, color: "#6366f1", bg: "#eef2ff", icon: <Briefcase size={18} /> },
          { label: "Published / Open", value: statCounts.published, color: "#16a34a", bg: "#f0fdf4", icon: <Eye size={18} /> },
          { label: "In Draft", value: statCounts.draft, color: "#d97706", bg: "#fffbeb", icon: <EyeOff size={18} /> },
          { label: "Total Applications", value: statCounts.apps, color: "#0284c7", bg: "#f0f9ff", icon: <Users size={18} /> },
          { label: "Offers Extended", value: statCounts.offered, color: "#059669", bg: "#ecfdf5", icon: <CheckCircle size={18} /> },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              gap: "14px",
              alignItems: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                width: "42px", height: "42px", borderRadius: "12px",
                background: s.bg, color: s.color,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TAB BAR ── */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          background: "#f1f5f9",
          padding: "5px",
          borderRadius: "12px",
          marginBottom: "24px",
          width: "fit-content",
        }}
      >
        {(
          [
            { key: "opportunities", label: "Drives & Postings", icon: <Building2 size={15} /> },
            { key: "ats", label: "Applicant Tracking", icon: <Users size={15} /> },
            { key: "analytics", label: "Analytics", icon: <BarChart3 size={15} /> },
            { key: "verification", label: "Verification & SGPA", icon: <GraduationCap size={15} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "9px 18px",
              borderRadius: "9px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "13px",
              fontWeight: 600,
              transition: "all 0.15s",
              background: activeTab === t.key ? "#fff" : "transparent",
              color: activeTab === t.key ? "var(--theme-primary, #111827)" : "#64748b",
              boxShadow: activeTab === t.key ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB 1: OPPORTUNITIES
      ══════════════════════════════════════════ */}
      {activeTab === "opportunities" && (
        <>
          {/* Filter Bar */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "20px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search by role, company or location…"
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                style={{ paddingLeft: "36px" }}
              />
            </div>
            <select value={oppStatusFilter} onChange={(e) => setOppStatusFilter(e.target.value)} style={{ flex: "0 1 160px" }}>
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
            <select value={oppTypeFilter} onChange={(e) => setOppTypeFilter(e.target.value)} style={{ flex: "0 1 160px" }}>
              <option value="all">All Types</option>
              <option value="internship">Internship</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
            </select>
            {!isCoordinator && (
              <button
                onClick={openCreate}
                className="primary-btn"
                style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
              >
                <Plus size={15} /> Post New Drive
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
              <div className="loading-spinner" />
              <p style={{ marginTop: "12px" }}>Loading opportunities…</p>
            </div>
          ) : filteredOpps.length === 0 ? (
            <div
              style={{
                textAlign: "center", padding: "70px 20px", background: "#fff",
                border: "1px solid #e2e8f0", borderRadius: "16px",
              }}
            >
              <Briefcase size={52} style={{ color: "#cbd5e1", marginBottom: "14px" }} />
              <h3 style={{ margin: "0 0 6px", color: "#334155" }}>No drives found</h3>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px" }}>
                {oppSearch ? "Try different search terms or clear filters" : "Post your first placement drive to get started"}
              </p>
              {!isCoordinator && (
                <button className="primary-btn" onClick={openCreate} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Plus size={15} /> Post First Drive
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
              {filteredOpps.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  appCount={applications.filter((a) => a.opportunity_id === opp.id).length}
                  departments={departments}
                  batches={batches}
                  isCoordinator={isCoordinator}
                  onEdit={() => openEdit(opp)}
                  onDelete={() => deleteOpp(opp.id, opp.title)}
                  onStatusChange={(s) => changeStatus(opp, s)}
                  onViewApplicants={() => {
                    setAtsOppFilter(opp.id);
                    setActiveTab("ats");
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB 2: ATS (STAGE 6 RECRUITMENT MANAGEMENT)
      ══════════════════════════════════════════ */}
      {activeTab === "ats" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden" }}>
          {/* ATS Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              background: "#fafafa",
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 3px", fontSize: "18px", fontWeight: 700 }}>Applicant Tracking &amp; Recruitment</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                {filteredApps.length} candidate{filteredApps.length !== 1 ? "s" : ""} matching filters &bull; {applications.length} total applications
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={exportXlsx}
                style={{
                  padding: "9px 18px", borderRadius: "9px", border: "1px solid #d1d5db",
                  background: "#fff", cursor: "pointer", display: "flex", alignItems: "center",
                  gap: "6px", fontSize: "13px", fontWeight: 600, color: "#374151",
                }}
              >
                <FileSpreadsheet size={15} style={{ color: "#16a34a" }} /> Export Excel
              </button>
            </div>
          </div>

          {/* Bulk Selection Toolbar */}
          {selectedAppIds.length > 0 && (
            <div
              style={{
                padding: "12px 24px",
                background: "#eff6ff",
                borderBottom: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e40af" }}>
                  {selectedAppIds.length} candidate{selectedAppIds.length > 1 ? "s" : ""} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAppIds([])}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: "12px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear Selection
                </button>
              </div>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => bulkUpdateStatus("shortlisted")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1px solid #7dd3fc",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Shortlist
                </button>
                <button
                  type="button"
                  onClick={() => openRoundModal(undefined, true)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1px solid #a5b4fc",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Record Assessment / Round
                </button>
                <button
                  type="button"
                  onClick={() => bulkUpdateStatus("interview")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1px solid #fde68a",
                    background: "#fef3c7",
                    color: "#b45309",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Move to Interview
                </button>
                <button
                  type="button"
                  onClick={() => bulkUpdateStatus("waitlisted")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1px solid #fed7aa",
                    background: "#ffedd5",
                    color: "#c2410c",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Waitlist
                </button>
                <button
                  type="button"
                  onClick={() => bulkUpdateStatus("offered")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1px solid #86efac",
                    background: "#dcfce7",
                    color: "#15803d",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Offer
                </button>
                <button
                  type="button"
                  onClick={() => bulkUpdateStatus("rejected")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "7px",
                    border: "1px solid #fca5a5",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* ATS Filter Bar */}
          <div
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
              background: "#fff",
            }}
          >
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <Search size={14} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search candidate name, roll no, email..."
                value={atsSearch}
                onChange={(e) => setAtsSearch(e.target.value)}
                style={{ paddingLeft: "34px", width: "100%", fontSize: "13px" }}
              />
            </div>

            {/* Opportunity filter */}
            <select value={atsOppFilter} onChange={(e) => setAtsOppFilter(e.target.value)} style={{ flex: "0 1 200px", fontSize: "13px" }}>
              <option value="all">All Drives</option>
              {visibleOpps.map((o) => (
                <option key={o.id} value={o.id}>{o.company_name} — {o.title}</option>
              ))}
            </select>

            {/* Status filter */}
            <select value={atsStatusFilter} onChange={(e) => setAtsStatusFilter(e.target.value)} style={{ flex: "0 1 140px", fontSize: "13px" }}>
              <option value="all">All Stages</option>
              {Object.keys(STAGE_CONFIG).map((st) => (
                <option key={st} value={st}>{STAGE_CONFIG[st].label}</option>
              ))}
            </select>

            {/* Eligibility filter */}
            <select value={atsEligibilityFilter} onChange={(e) => setAtsEligibilityFilter(e.target.value)} style={{ flex: "0 1 140px", fontSize: "13px" }}>
              <option value="all">All Eligibility</option>
              <option value="eligible">Eligible Only</option>
              <option value="needs_review">Needs Review</option>
              <option value="not_eligible">Not Eligible</option>
            </select>

            {/* Department filter */}
            <select value={atsDeptFilter} onChange={(e) => setAtsDeptFilter(e.target.value)} style={{ flex: "0 1 150px", fontSize: "13px" }}>
              <option value="all">All Departments</option>
              {departments
                .filter((d) => (!isCoordinator || myDeptIds.length === 0 || myDeptIds.includes(d.id)))
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>

            {/* Batch filter */}
            <select value={atsBatchFilter} onChange={(e) => setAtsBatchFilter(e.target.value)} style={{ flex: "0 1 140px", fontSize: "13px" }}>
              <option value="all">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Reset */}
            {(atsSearch || atsOppFilter !== "all" || atsStatusFilter !== "all" || atsEligibilityFilter !== "all" || atsDeptFilter !== "all" || atsBatchFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setAtsSearch("");
                  setAtsOppFilter("all");
                  setAtsStatusFilter("all");
                  setAtsEligibilityFilter("all");
                  setAtsDeptFilter("all");
                  setAtsBatchFilter("all");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: "6px 8px",
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* ATS Table */}
          {filteredApps.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
              <Users size={44} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
              <p style={{ margin: 0 }}>No applications match the current filters</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 14px", width: "40px", borderBottom: "1px solid #e2e8f0" }}>
                      <input
                        type="checkbox"
                        checked={
                          filteredApps.length > 0 &&
                          filteredApps.every((a) => selectedAppIds.includes(a.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAppIds(filteredApps.map((a) => a.id));
                          } else {
                            setSelectedAppIds([]);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    {["Candidate", "Drive & Role", "Department / Batch", "Eligibility", "Current Round / Score", "Stage", "Actions"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px", textAlign: "left", fontWeight: 700,
                          fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em",
                          color: "#64748b", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map((app, i) => {
                    const dept = departments.find((d) => d.id === app.students?.department_id);
                    const batch = batches.find((b) => b.id === app.students?.batch_id);
                    const isSelected = selectedAppIds.includes(app.id);
                    const elig = ELIGIBILITY_CONFIG[app.eligibility_status || "eligible"] || ELIGIBILITY_CONFIG.eligible;
                    const stg = STAGE_CONFIG[app.status || "applied"] || STAGE_CONFIG.applied;
                    const currentRoundScore = app.round_scores?.[app.current_round]?.score;

                    return (
                      <tr
                        key={app.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: isSelected ? "#f0f7ff" : i % 2 === 0 ? "#fff" : "#fafafa",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAppIds((prev) => [...prev, app.id]);
                              } else {
                                setSelectedAppIds((prev) => prev.filter((id) => id !== app.id));
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <button
                            type="button"
                            onClick={() => openCandidateModal(app)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              font: "inherit",
                              textAlign: "left",
                              cursor: "pointer",
                              fontWeight: 700,
                              color: "#2563eb",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Click to view candidate snapshot, recruitment history & answers"
                          >
                            {app.students?.name || app.profiles?.full_name || "—"}
                            <Eye size={12} color="#64748b" />
                          </button>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            {app.students?.student_id && <span>{app.students.student_id} &bull; </span>}
                            {app.profiles?.email}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{app.career_opportunities?.title}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{app.career_opportunities?.company_name}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div>{dept?.name || "—"}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{batch?.name || "—"}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: elig.bg,
                              color: elig.color,
                              border: `1px solid ${elig.border}`,
                            }}
                            title={app.eligibility_reasons?.join("\n") || "Met all criteria"}
                          >
                            {elig.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, fontSize: "12px", color: "#334155" }}>
                            {app.current_round || "Application Submitted"}
                          </div>
                          {currentRoundScore !== undefined && (
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#4f46e5", marginTop: "2px" }}>
                              Score: {currentRoundScore}/100
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <select
                            value={app.status}
                            onChange={(e) => updateCandidateStatus(app.id, e.target.value)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              borderRadius: "7px",
                              border: `1px solid ${stg.border}`,
                              cursor: "pointer",
                              background: stg.bg,
                              color: stg.color,
                            }}
                          >
                            {Object.keys(STAGE_CONFIG).map((s) => (
                              <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={() => openRoundModal(app, false)}
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                color: "#4f46e5",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                              title="Record round scores and evaluation"
                            >
                              <Award size={12} /> Round
                            </button>
                            <button
                              type="button"
                              onClick={() => { setActiveApp(app); setFeedbackText(app.feedback || ""); setFeedbackOpen(true); }}
                              style={{
                                background: "transparent",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "4px 7px",
                                fontSize: "11px",
                                color: "#374151",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                              title="Coordinator Notes"
                            >
                              <MessageSquare size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 3: ANALYTICS
      ══════════════════════════════════════════ */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Funnel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
              <SectionHeader icon={<BarChart3 size={18} />} title="Recruitment Funnel" subtitle="Candidate distribution across all drives" />
              {[
                { label: "Applied",   status: "applied",   color: "#6366f1" },
                { label: "Screening", status: "screening", color: "#8b5cf6" },
                { label: "Interview", status: "interview", color: "#f59e0b" },
                { label: "Offered",   status: "offered",   color: "#10b981" },
                { label: "Rejected",  status: "rejected",  color: "#ef4444" },
              ].map((s) => {
                const count = applications.filter((a) => a.status === s.status).length;
                const pct = applications.length ? Math.round((count / applications.length) * 100) : 0;
                return (
                  <div key={s.status} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                      <span style={{ fontWeight: 600 }}>{s.label}</span>
                      <span style={{ color: "#64748b" }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: "8px", borderRadius: "4px", background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: "4px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drive Type Breakdown */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
              <SectionHeader icon={<Briefcase size={18} />} title="Drive Types" subtitle="Breakdown by opportunity category" />
              {[
                { label: "Internships",    type: "internship", color: "#f59e0b", bg: "#fef3c7" },
                { label: "Full Time",      type: "full_time",  color: "#3b82f6", bg: "#dbeafe" },
                { label: "Part Time",      type: "part_time",  color: "#8b5cf6", bg: "#ede9fe" },
                { label: "Contract",       type: "contract",   color: "#10b981", bg: "#dcfce7" },
              ].map((item) => {
                const dCount = visibleOpps.filter((o) => o.type === item.type).length;
                const aCount = applications.filter((a) => a.career_opportunities?.type === item.type).length;
                return (
                  <div
                    key={item.type}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", borderRadius: "10px", background: item.bg,
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>{item.label}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{aCount} applications</div>
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: item.color }}>{dCount}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Drives by Applications */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
            <SectionHeader icon={<Star size={18} />} title="Top Drives by Interest" subtitle="Ranked by number of student applications" />
            {visibleOpps
              .map((o) => ({
                ...o,
                appCount: applications.filter((a) => a.opportunity_id === o.id).length,
              }))
              .sort((a, b) => b.appCount - a.appCount)
              .slice(0, 8)
              .map((o, i) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "10px 0", borderBottom: i < 7 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  <div
                    style={{
                      width: "28px", height: "28px", borderRadius: "8px",
                      background: i === 0 ? "#fef3c7" : i === 1 ? "#f1f5f9" : "#fafafa",
                      color: i === 0 ? "#92400e" : "#64748b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: "13px", flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{o.title}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{o.company_name}</div>
                  </div>
                  <Badge color={STATUS_CONFIG[o.status as OpportunityStatus]?.color ?? "#64748b"} bg={STATUS_CONFIG[o.status as OpportunityStatus]?.bg ?? "#f3f4f6"}>
                    {STATUS_CONFIG[o.status as OpportunityStatus]?.label ?? o.status}
                  </Badge>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a", minWidth: "30px", textAlign: "right" }}>
                    {o.appCount}
                  </div>
                </div>
              ))}
            {visibleOpps.length === 0 && (
              <p style={{ textAlign: "center", color: "#94a3b8", padding: "20px 0" }}>No drives available</p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 4: ACADEMIC VERIFICATION & SGPA
      ══════════════════════════════════════════ */}
      {activeTab === "verification" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Section 1: Board Marks & Backlogs Verification Queue */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
              <div>
                <SectionHeader
                  icon={<ShieldCheck size={18} color="#2563eb" />}
                  title="Academic Marks & Backlog Verification Queue"
                  subtitle="Verify student self-declared 10th marks, 12th marks, and active backlogs"
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", fontWeight: 600, color: "#475569" }}>
                  <input
                    type="checkbox"
                    checked={showOnlyPending}
                    onChange={(e) => setShowOnlyPending(e.target.checked)}
                  />
                  Pending Verification Only
                </label>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={verificationSearch}
                    onChange={(e) => setVerificationSearch(e.target.value)}
                    style={{ padding: "6px 10px 6px 30px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                  />
                </div>
                <button
                  className="secondary-btn"
                  onClick={loadVerificationData}
                  disabled={verificationLoading}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "7px 12px" }}
                >
                  <RefreshCw size={13} className={verificationLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Verification Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "10px 14px" }}>Student</th>
                    <th style={{ padding: "10px 14px" }}>Dept & Batch</th>
                    <th style={{ padding: "10px 14px" }}>10th Marks</th>
                    <th style={{ padding: "10px 14px" }}>12th Marks</th>
                    <th style={{ padding: "10px 14px" }}>Active Backlogs</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {verificationProfiles
                    .filter((p) => {
                      if (isCoordinator && myDeptIds.length > 0 && p.students?.department_id) {
                        if (!myDeptIds.includes(p.students.department_id)) return false;
                      }
                      if (showOnlyPending) {
                        const isPending = !p.marks_10th_verified || !p.marks_12th_verified || !p.backlogs_verified;
                        if (!isPending) return false;
                      }
                      if (verificationSearch) {
                        const term = verificationSearch.toLowerCase();
                        const sName = (p.students?.name || p.profiles?.full_name || "").toLowerCase();
                        const sRoll = (p.students?.student_id || "").toLowerCase();
                        if (!sName.includes(term) && !sRoll.includes(term)) return false;
                      }
                      return true;
                    })
                    .map((p, i) => {
                      const dept = departments.find((d) => d.id === p.students?.department_id);
                      const batch = batches.find((b) => b.id === p.students?.batch_id);
                      const allVerified = p.marks_10th_verified && p.marks_12th_verified && p.backlogs_verified;

                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              {p.students?.name || p.profiles?.full_name || "—"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              {p.students?.student_id && <span>{p.students.student_id} &bull; </span>}
                              {p.profiles?.email}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div>{dept?.name || "—"}</div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>{batch?.name || "—"}</div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 600 }}>{p.marks_10th != null ? `${p.marks_10th}%` : "—"}</span>
                              {p.marks_10th_verified ? (
                                <span style={{ fontSize: "11px", color: "#166534", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  ✓ Verified
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => verifyField(p.id, "marks_10th")}
                                  style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                                >
                                  Verify
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 600 }}>{p.marks_12th != null ? `${p.marks_12th}%` : "—"}</span>
                              {p.marks_12th_verified ? (
                                <span style={{ fontSize: "11px", color: "#166534", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  ✓ Verified
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => verifyField(p.id, "marks_12th")}
                                  style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                                >
                                  Verify
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 600 }}>{p.active_backlogs ?? 0}</span>
                              {p.backlogs_verified ? (
                                <span style={{ fontSize: "11px", color: "#166534", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  ✓ Verified
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => verifyField(p.id, "backlogs")}
                                  style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                                >
                                  Verify
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            {!allVerified ? (
                              <button
                                type="button"
                                className="primary-btn"
                                onClick={() => verifyField(p.id, "all")}
                                style={{ padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              >
                                <Check size={12} /> Verify All
                              </button>
                            ) : (
                              <span style={{ color: "#166534", fontWeight: 700, fontSize: "12px" }}>✓ Fully Verified</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {verificationProfiles.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                  No candidate profiles recorded yet or migration_career_stage3.sql not yet executed.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Official SGPA & Semester Records Management */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
            <SectionHeader
              icon={<GraduationCap size={18} color="#2563eb" />}
              title="Official Semester SGPA & CGPA Records"
              subtitle="Coordinators enter official semester grades here — strictly read-only for students"
            />

            <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) 2fr", gap: "24px", marginTop: "16px" }}>
              {/* Left Column: Student Selector */}
              <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "20px" }}>
                <label style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", display: "block" }}>
                  Select Student
                </label>
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search name or roll no..."
                    value={sgpaSearchStudent}
                    onChange={(e) => setSgpaSearchStudent(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px 7px 32px", fontSize: "13px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                  />
                </div>

                <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {allStudents
                    .filter((s) => {
                      if (isCoordinator && myDeptIds.length > 0 && s.department_id) {
                        if (!myDeptIds.includes(s.department_id)) return false;
                      }
                      if (sgpaSearchStudent) {
                        const term = sgpaSearchStudent.toLowerCase();
                        return (
                          (s.name || "").toLowerCase().includes(term) ||
                          (s.student_id || "").toLowerCase().includes(term)
                        );
                      }
                      return true;
                    })
                    .slice(0, 40)
                    .map((s) => {
                      const isSelected = selectedStudentForSgpa?.id === s.id;
                      const dept = departments.find((d) => d.id === s.department_id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => loadStudentSgpa(s)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            background: isSelected ? "#eff6ff" : "#f8fafc",
                            border: `1px solid ${isSelected ? "#93c5fd" : "#e2e8f0"}`,
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: "13px", color: isSelected ? "#1e40af" : "#0f172a" }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            {s.student_id} {dept?.code ? `• ${dept.code}` : ""}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: Grades for selected student */}
              <div>
                {selectedStudentForSgpa ? (
                  <div>
                    <div style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: "10px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>
                        {selectedStudentForSgpa.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Roll No: {selectedStudentForSgpa.student_id} &bull; Dept: {departments.find((d) => d.id === selectedStudentForSgpa.department_id)?.name || "—"}
                      </div>
                    </div>

                    {/* Grade input form */}
                    <div style={{ padding: "16px", background: "#f1f5f9", borderRadius: "12px", marginBottom: "20px" }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "12px", color: "#1e293b" }}>
                        Record / Update Semester Grade
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 600 }}>Semester</label>
                          <select
                            value={sgpaForm.semester_no}
                            onChange={(e) => {
                              const sem = Number(e.target.value);
                              setSgpaForm({
                                ...sgpaForm,
                                semester_no: sem,
                                semester_name: `Semester ${sem}`,
                              });
                            }}
                            style={{ width: "100%", padding: "7px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                              <option key={s} value={s}>Sem {s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 600 }}>SGPA (0-10) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            placeholder="e.g. 8.45"
                            value={sgpaForm.sgpa}
                            onChange={(e) => setSgpaForm({ ...sgpaForm, sgpa: e.target.value })}
                            style={{ width: "100%", padding: "7px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 600 }}>CGPA (0-10)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            placeholder="e.g. 8.20"
                            value={sgpaForm.cgpa}
                            onChange={(e) => setSgpaForm({ ...sgpaForm, cgpa: e.target.value })}
                            style={{ width: "100%", padding: "7px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: 600 }}>Backlogs</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={sgpaForm.backlogs}
                            onChange={(e) => setSgpaForm({ ...sgpaForm, backlogs: e.target.value })}
                            style={{ width: "100%", padding: "7px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                          />
                        </div>
                      </div>
                      <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={savingSgpa || !sgpaForm.sgpa}
                          onClick={saveSgpaRecord}
                          style={{ padding: "6px 16px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <CheckCircle size={14} /> {savingSgpa ? "Saving..." : "Save Grade"}
                        </button>
                      </div>
                    </div>

                    {/* Existing Records Table */}
                    <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", color: "#334155" }}>
                      Recorded Semesters ({sgpaRecords.length})
                    </div>
                    {sgpaRecords.length > 0 ? (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px" }}>Semester</th>
                            <th style={{ padding: "8px 12px" }}>SGPA</th>
                            <th style={{ padding: "8px 12px" }}>Cumulative CGPA</th>
                            <th style={{ padding: "8px 12px" }}>Backlogs</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sgpaRecords.map((r) => (
                            <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                                {r.semester_name || `Sem ${r.semester_no}`}
                              </td>
                              <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1e40af" }}>
                                {Number(r.sgpa).toFixed(2)}
                              </td>
                              <td style={{ padding: "8px 12px", fontWeight: 700, color: "#047857" }}>
                                {r.cgpa ? Number(r.cgpa).toFixed(2) : "—"}
                              </td>
                              <td style={{ padding: "8px 12px" }}>
                                {r.backlogs > 0 ? (
                                  <span style={{ color: "#b91c1c", fontWeight: 700 }}>{r.backlogs}</span>
                                ) : (
                                  <span style={{ color: "#166534" }}>0</span>
                                )}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => deleteSgpaRecord(r.id)}
                                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "13px" }}>
                        No semester grades recorded yet for this student. Use the form above to add their official SGPA.
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    ← Select a student from the left to view and record official semester grades
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          OPPORTUNITY FORM MODAL
      ══════════════════════════════════════════ */}
      {formOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            zIndex: 2000, padding: "20px", overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "760px",
              boxShadow: "0 24px 48px rgba(0,0,0,0.18)", marginTop: "20px", marginBottom: "20px",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "22px 28px", borderBottom: "1px solid #f1f5f9",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "linear-gradient(135deg, #f8fafc, #fff)",
                borderRadius: "20px 20px 0 0",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 3px", fontSize: "20px", fontWeight: 800 }}>
                  {editingId ? "Edit Opportunity" : "Post New Opportunity"}
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  Fill each section to publish a complete placement drive
                </p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Section Tab Nav */}
            <div
              style={{
                display: "flex", overflowX: "auto", padding: "0 28px",
                borderBottom: "1px solid #f1f5f9", background: "#fafafa",
                gap: "2px",
              }}
            >
              {FORM_SECTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setFormSection(s.key)}
                  style={{
                    padding: "13px 16px", border: "none", cursor: "pointer", background: "transparent",
                    display: "flex", alignItems: "center", gap: "6px",
                    fontSize: "13px", fontWeight: formSection === s.key ? 700 : 500,
                    color: formSection === s.key ? "var(--theme-primary, #111827)" : "#64748b",
                    borderBottom: formSection === s.key ? "2px solid var(--theme-primary, #111827)" : "2px solid transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <form onSubmit={saveOpp}>
              <div style={{ padding: "24px 28px", maxHeight: "65vh", overflowY: "auto" }}>

                {/* ── COMPANY SECTION ── */}
                {formSection === "company" && (
                  <>
                    <FormSection title="Company Information" icon={<Building2 size={16} />} accent="#6366f1">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div style={{ gridColumn: "span 2" }}>
                          <label>Company / Organisation Name *</label>
                          <input type="text" placeholder="e.g. Google, TCS, Infosys"
                            value={form.company_name}
                            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                            required />
                        </div>
                        <div>
                          <label>Company Website</label>
                          <div style={{ position: "relative" }}>
                            <Globe size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            <input type="url" placeholder="https://company.com"
                              value={form.company_website}
                              onChange={(e) => setForm({ ...form, company_website: e.target.value })}
                              style={{ paddingLeft: "34px" }} />
                          </div>
                        </div>
                        <div>
                          <label>Company Logo URL</label>
                          <input type="url" placeholder="https://logo.example.com/logo.png"
                            value={form.company_logo_url}
                            onChange={(e) => setForm({ ...form, company_logo_url: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <label>Company / Organisation Description</label>
                          <textarea rows={3} placeholder="Brief overview of the company, its products, mission and culture…"
                            value={form.company_description}
                            onChange={(e) => setForm({ ...form, company_description: e.target.value })}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontFamily: "inherit", fontSize: "13px" }} />
                        </div>
                      </div>
                    </FormSection>
                  </>
                )}

                {/* ── ROLE SECTION ── */}
                {formSection === "role" && (
                  <>
                    <FormSection title="Role Details" icon={<Briefcase size={16} />} accent="#3b82f6">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div style={{ gridColumn: "span 2" }}>
                          <label>Job / Internship Title *</label>
                          <input type="text" placeholder="e.g. Software Development Engineer"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required />
                        </div>
                        <div>
                          <label>Opportunity Type</label>
                          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                            <option value="internship">Internship</option>
                            <option value="full_time">Full Time</option>
                            <option value="part_time">Part Time</option>
                            <option value="contract">Contract / Freelance</option>
                          </select>
                        </div>
                        <div>
                          <label>Duration</label>
                          <input type="text" placeholder="e.g. 3 Months, 6 Months, Permanent"
                            value={form.duration}
                            onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                        </div>
                        <div>
                          <label>Stipend (for Internships)</label>
                          <input type="text" placeholder="e.g. ₹25,000/month"
                            value={form.stipend}
                            onChange={(e) => setForm({ ...form, stipend: e.target.value })} />
                        </div>
                        <div>
                          <label>CTC / Annual Package (for Placements)</label>
                          <input type="text" placeholder="e.g. 7.5 LPA, ₹8,00,000 PA"
                            value={form.ctc}
                            onChange={(e) => setForm({ ...form, ctc: e.target.value })} />
                        </div>
                        <div>
                          <label>Location *</label>
                          <div style={{ position: "relative" }}>
                            <MapPin size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            <input type="text" placeholder="e.g. Bangalore, Remote"
                              value={form.location}
                              onChange={(e) => setForm({ ...form, location: e.target.value })}
                              style={{ paddingLeft: "34px" }} />
                          </div>
                        </div>
                        <div>
                          <label>Workplace Mode</label>
                          <select value={form.workplace_type} onChange={(e) => setForm({ ...form, workplace_type: e.target.value as any })}>
                            <option value="on_site">On-site</option>
                            <option value="remote">Fully Remote</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </div>
                        <div>
                          <label>Application Deadline *</label>
                          <input type="date"
                            value={form.deadline}
                            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                            required />
                        </div>
                        <div>
                          <label>Publishing Status</label>
                          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OpportunityStatus })}>
                            <option value="draft">Draft (Hidden from students)</option>
                            <option value="published">Published (Visible & Accepting)</option>
                            <option value="closed">Closed (Visible but Not Accepting)</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <label>Job Description & Responsibilities *</label>
                          <textarea rows={5} placeholder="Describe the role, day-to-day responsibilities, team and goals…"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            required
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontFamily: "inherit", fontSize: "13px" }} />
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <label>Key Requirements & Qualifications</label>
                          <textarea rows={3} placeholder="List required degrees, programming languages, tools or certifications…"
                            value={form.requirements}
                            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontFamily: "inherit", fontSize: "13px" }} />
                        </div>
                      </div>
                    </FormSection>
                  </>
                )}

                {/* ── ELIGIBILITY SECTION ── */}
                {formSection === "eligibility" && (
                  <>
                    <FormSection title="Academic Eligibility" icon={<CheckCircle size={16} />} accent="#059669">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label>Minimum CGPA (0 = no cutoff)</label>
                          <input type="number" step="0.01" min="0" max="10"
                            value={form.min_cgpa}
                            onChange={(e) => setForm({ ...form, min_cgpa: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label>Minimum Attendance % (0 = no cutoff)</label>
                          <input type="number" step="1" min="0" max="100"
                            value={form.min_attendance}
                            onChange={(e) => setForm({ ...form, min_attendance: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label>Minimum 10th Marks / Percentage (0 = no cutoff)</label>
                          <input type="number" step="0.01" min="0" max="100"
                            value={form.min_marks_10th}
                            onChange={(e) => setForm({ ...form, min_marks_10th: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label>Minimum 12th / Diploma Marks % (0 = no cutoff)</label>
                          <input type="number" step="0.01" min="0" max="100"
                            value={form.min_marks_12th}
                            onChange={(e) => setForm({ ...form, min_marks_12th: parseFloat(e.target.value) || 0 })} />
                        </div>

                        {/* Backlog Policy */}
                        <div style={{ gridColumn: "span 2", padding: "16px", background: "#fef2f2", borderRadius: "10px", border: "1px solid #fecaca" }}>
                          <label
                            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 700, margin: 0 }}
                          >
                            <input
                              type="checkbox"
                              checked={form.allow_backlogs}
                              onChange={(e) => setForm({ ...form, allow_backlogs: e.target.checked })}
                              style={{ width: "auto", margin: 0 }}
                            />
                            Allow students with active backlogs to apply
                          </label>
                          {form.allow_backlogs && (
                            <div style={{ marginTop: "12px" }}>
                              <label>Maximum number of active backlogs allowed (0 = unlimited)</label>
                              <input
                                type="number" min="0"
                                value={form.max_backlogs}
                                onChange={(e) => setForm({ ...form, max_backlogs: parseInt(e.target.value) || 0 })}
                                style={{ maxWidth: "180px" }}
                              />
                            </div>
                          )}
                          {!form.allow_backlogs && (
                            <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#b91c1c" }}>
                              Students with any active backlogs will not be eligible to apply.
                            </p>
                          )}
                        </div>
                      </div>
                    </FormSection>

                    <FormSection title="Target Audience" icon={<Users size={16} />} accent="#6366f1">
                      <div>
                        <label style={{ marginBottom: "8px", display: "block" }}>
                          Eligible Departments
                          <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: "6px" }}>(empty = open to all)</span>
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                          {departments.map((d) => {
                            const sel = form.target_departments.includes(d.id);
                            const myDept = isCoordinator && !myDeptIds.includes(d.id);
                            return (
                              <button
                                key={d.id}
                                type="button"
                                disabled={myDept}
                                onClick={() =>
                                  setForm({
                                    ...form,
                                    target_departments: sel
                                      ? form.target_departments.filter((x) => x !== d.id)
                                      : [...form.target_departments, d.id],
                                  })
                                }
                                style={{
                                  padding: "6px 14px", borderRadius: "20px", fontWeight: 600, fontSize: "13px",
                                  border: sel ? "2px solid var(--theme-primary, #111827)" : "1px solid #d1d5db",
                                  background: sel ? "var(--theme-primary, #111827)" : "#fff",
                                  color: sel ? "#fff" : myDept ? "#cbd5e1" : "#374151",
                                  cursor: myDept ? "not-allowed" : "pointer",
                                  opacity: myDept ? 0.5 : 1,
                                }}
                              >
                                {sel ? "✓ " : ""}{d.name}
                              </button>
                            );
                          })}
                        </div>

                        <label style={{ marginBottom: "8px", display: "block" }}>
                          Eligible Batches
                          <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: "6px" }}>(empty = all batches)</span>
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {batches
                            .filter((b) => form.target_departments.length === 0 || form.target_departments.includes(b.department_id))
                            .map((b) => {
                              const sel = form.target_batches.includes(b.id);
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() =>
                                    setForm({
                                      ...form,
                                      target_batches: sel
                                        ? form.target_batches.filter((x) => x !== b.id)
                                        : [...form.target_batches, b.id],
                                    })
                                  }
                                  style={{
                                    padding: "6px 14px", borderRadius: "20px", fontWeight: 600, fontSize: "13px",
                                    border: sel ? "2px solid #0369a1" : "1px solid #d1d5db",
                                    background: sel ? "#0369a1" : "#fff",
                                    color: sel ? "#fff" : "#374151",
                                    cursor: "pointer",
                                  }}
                                >
                                  {sel ? "✓ " : ""}{b.name}
                                </button>
                              );
                            })}
                          {batches.length === 0 && (
                            <span style={{ color: "#94a3b8", fontSize: "13px" }}>No batches available. Add batches in Academic Structure.</span>
                          )}
                        </div>
                      </div>
                    </FormSection>
                  </>
                )}

                {/* ── SKILLS SECTION ── */}
                {formSection === "skills" && (
                  <FormSection title="Skill Requirements" icon={<Tag size={16} />} accent="#f59e0b">
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      <div>
                        <div
                          style={{
                            padding: "10px 14px", background: "#1e293b", borderRadius: "10px",
                            marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px",
                          }}
                        >
                          <Zap size={15} color="#facc15" />
                          <span style={{ fontWeight: 700, color: "#fff", fontSize: "13px" }}>Mandatory Skills</span>
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>— Required to apply</span>
                        </div>
                        <SkillTagEditor
                          label=""
                          tags={form.mandatory_skills}
                          onChange={(tags) => setForm({ ...form, mandatory_skills: tags })}
                          placeholder="e.g. Python, React, SQL, Machine Learning"
                          color="#fff"
                          bg="#1e293b"
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            padding: "10px 14px", background: "#f1f5f9", borderRadius: "10px",
                            marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px",
                          }}
                        >
                          <Star size={15} color="#f59e0b" />
                          <span style={{ fontWeight: 700, color: "#374151", fontSize: "13px" }}>Preferred / Good-to-Have Skills</span>
                        </div>
                        <SkillTagEditor
                          label=""
                          tags={form.preferred_skills}
                          onChange={(tags) => setForm({ ...form, preferred_skills: tags })}
                          placeholder="e.g. Docker, Kubernetes, TypeScript, AWS"
                          color="#374151"
                          bg="#f1f5f9"
                        />
                      </div>
                    </div>
                  </FormSection>
                )}

                {/* ── QUESTIONS & ROUNDS SECTION ── */}
                {formSection === "questions" && (
                  <>
                    <FormSection title="Custom Application Questions" icon={<MessageSquare size={16} />} accent="#8b5cf6">
                      <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                        Add specific screening questions for applicants to answer when they apply. Answers will be evaluated and visible in the ATS.
                      </p>
                      <CustomQuestionsEditor
                        questions={form.custom_questions}
                        onChange={(q) => setForm({ ...form, custom_questions: q })}
                      />
                    </FormSection>

                    <FormSection title="Recruitment Rounds & Pipeline" icon={<Layers size={16} />} accent="#4f46e5">
                      <RecruitmentRoundsEditor
                        rounds={form.recruitment_rounds}
                        onChange={(r) => setForm({ ...form, recruitment_rounds: r })}
                      />
                    </FormSection>
                  </>
                )}
              </div>

              {/* Form Footer */}
              <div
                style={{
                  padding: "16px 28px",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fafafa",
                  borderRadius: "0 0 20px 20px",
                }}
              >
                {/* Section navigation */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {formSection !== "company" && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        const idx = FORM_SECTIONS.findIndex((s) => s.key === formSection);
                        if (idx > 0) setFormSection(FORM_SECTIONS[idx - 1].key);
                      }}
                    >
                      ← Back
                    </button>
                  )}
                  {formSection !== "questions" && (
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => {
                        const idx = FORM_SECTIONS.findIndex((s) => s.key === formSection);
                        if (idx < FORM_SECTIONS.length - 1) setFormSection(FORM_SECTIONS[idx + 1].key);
                      }}
                    >
                      Next →
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setFormOpen(false)}
                  >
                    Cancel
                  </button>
                  {/* Save as Draft */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setForm((f) => ({ ...f, status: "draft" }));
                      setTimeout(() => document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click(), 50);
                    }}
                    style={{
                      padding: "10px 18px", borderRadius: "9px", border: "1px solid #d1d5db",
                      background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px",
                      display: "flex", alignItems: "center", gap: "6px",
                    }}
                  >
                    <EyeOff size={14} /> Save as Draft
                  </button>
                  {/* Publish */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="primary-btn"
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Send size={14} />
                    {saving ? "Saving…" : editingId ? "Save Changes" : "Publish Opportunity"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          FEEDBACK MODAL
      ══════════════════════════════════════════ */}
      {feedbackOpen && activeApp && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2001, padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "480px",
              padding: "24px", boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Candidate Notes</h3>
              <button onClick={() => setFeedbackOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                padding: "12px 14px", background: "#f8fafc", borderRadius: "10px",
                fontSize: "13px", marginBottom: "14px", border: "1px solid #e2e8f0",
              }}
            >
              <strong>{activeApp.students?.name || activeApp.profiles?.full_name}</strong>
              {" "}→ {activeApp.career_opportunities?.title} at {activeApp.career_opportunities?.company_name}
            </div>
            <label>Feedback / Interview Schedule (visible to candidate)</label>
            <textarea
              rows={4}
              placeholder="e.g. Technical interview scheduled for Monday 2 PM via Google Meet: https://meet.google.com/..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontFamily: "inherit", fontSize: "13px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button className="secondary-btn" onClick={() => setFeedbackOpen(false)}>Cancel</button>
              <button className="primary-btn" onClick={saveFeedback} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={14} /> Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CANDIDATE DETAILS MODAL (ATS STAGE 6)
      ══════════════════════════════════════════ */}
      {candidateModalOpen && candidateApp && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2002, padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff", borderRadius: "18px", width: "100%", maxWidth: "780px",
              maxHeight: "88vh", overflowY: "auto", padding: "28px", boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                    Candidate Profile &amp; Recruitment Record
                  </span>
                  {candidateApp.eligibility_status && (
                    <span
                      style={{
                        padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                        background: ELIGIBILITY_CONFIG[candidateApp.eligibility_status]?.bg || "#f1f5f9",
                        color: ELIGIBILITY_CONFIG[candidateApp.eligibility_status]?.color || "#334155",
                      }}
                    >
                      {ELIGIBILITY_CONFIG[candidateApp.eligibility_status]?.label || candidateApp.eligibility_status}
                    </span>
                  )}
                </div>
                <h2 style={{ margin: "2px 0", fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
                  {candidateApp.students?.name || candidateApp.profiles?.full_name || "Candidate"}
                </h2>
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  {candidateApp.students?.student_id && <span>Roll No: {candidateApp.students.student_id} &bull; </span>}
                  {candidateApp.profiles?.email} &bull; {candidateApp.career_opportunities?.company_name} — {candidateApp.career_opportunities?.title}
                </div>
              </div>
              <button
                onClick={() => setCandidateModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "20px",
              }}
            >
              {[
                { key: "overview", label: "Overview & Answers", icon: <FileText size={14} /> },
                { key: "snapshot", label: "Academic Snapshot", icon: <GraduationCap size={14} /> },
                { key: "history", label: `Timeline & Logs (${candidateAuditHistory.length})`, icon: <History size={14} /> },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setCandidateModalTab(t.key as any)}
                  style={{
                    padding: "9px 16px",
                    border: "none",
                    borderBottom: candidateModalTab === t.key ? "2px solid #2563eb" : "2px solid transparent",
                    background: "none",
                    fontWeight: candidateModalTab === t.key ? 700 : 500,
                    color: candidateModalTab === t.key ? "#2563eb" : "#64748b",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW & RESPONSES */}
            {candidateModalTab === "overview" && (
              <div>
                {/* Meta Bar */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Applied On</span>
                    <strong style={{ fontSize: "13px" }}>{new Date(candidateApp.applied_at).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Current Stage</span>
                    <strong style={{ fontSize: "13px", textTransform: "capitalize", color: "#2563eb" }}>
                      {STAGE_CONFIG[candidateApp.status]?.label || candidateApp.status}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Current Round</span>
                    <strong style={{ fontSize: "13px", color: "#334155" }}>{candidateApp.current_round || "Application Review"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Withdrawal</span>
                    <strong style={{ fontSize: "13px", color: candidateApp.withdrawn_at ? "#b91c1c" : "#166534" }}>
                      {candidateApp.withdrawn_at ? "Withdrawn" : "Active"}
                    </strong>
                  </div>
                </div>

                {/* Resume Link */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Submitted Resume</label>
                  {candidateApp.resume_url ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <a
                        href={candidateApp.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="secondary-btn"
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", fontSize: "13px" }}
                      >
                        <ExternalLink size={14} /> Open Submitted CV
                      </a>
                      {candidateApp.profile_snapshot?.cv_version && (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          (Version: <strong>{candidateApp.profile_snapshot.cv_version.name}</strong> &bull; {candidateApp.profile_snapshot.cv_version.file_name})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "13px" }}>No resume link provided</span>
                  )}
                </div>

                {/* Cover Letter */}
                {candidateApp.cover_letter && (
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Cover Letter / Statement</label>
                    <div style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", fontSize: "13px", color: "#334155", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {candidateApp.cover_letter}
                    </div>
                  </div>
                )}

                {/* Screening Answers */}
                {candidateApp.custom_answers && Object.keys(candidateApp.custom_answers).length > 0 ? (
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "8px" }}>Custom Screening Responses</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {Object.entries(candidateApp.custom_answers).map(([qId, ans], idx) => {
                        const qObj = candidateApp.career_opportunities?.custom_questions?.find((cq: any) => cq.id === qId);
                        const qText = qObj?.question || `Question ${idx + 1}`;
                        return (
                          <div key={qId} style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                              {idx + 1}. {qText}
                            </div>
                            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>
                              {String(ans) || "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "20px" }}>
                    No custom screening questions were configured for this drive.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ACADEMIC SNAPSHOT */}
            {candidateModalTab === "snapshot" && (
              <div>
                <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", fontSize: "12px", color: "#166534", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldCheck size={16} />
                  <span>Immutable institutional snapshot captured when the candidate applied. Guaranteed authentic &amp; non-repudiable.</span>
                </div>

                {(() => {
                  const snap = candidateApp.profile_snapshot || {};
                  const acad = snap.academic || {};
                  return (
                    <div>
                      {/* Academic Cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "18px" }}>
                        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>10th Marks</span>
                          <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                            {acad.marks_10th != null ? `${acad.marks_10th}%` : "—"}
                            {acad.marks_10th_verified && <span style={{ color: "#16a34a", fontSize: "11px", marginLeft: "4px" }}>✓ Verified</span>}
                          </div>
                        </div>
                        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>12th Marks</span>
                          <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                            {acad.marks_12th != null ? `${acad.marks_12th}%` : "—"}
                            {acad.marks_12th_verified && <span style={{ color: "#16a34a", fontSize: "11px", marginLeft: "4px" }}>✓ Verified</span>}
                          </div>
                        </div>
                        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>Snapshot CGPA</span>
                          <div style={{ fontSize: "15px", fontWeight: 800, color: "#1e40af", marginTop: "2px" }}>
                            {acad.cgpa != null ? Number(acad.cgpa).toFixed(2) : "—"}
                          </div>
                        </div>
                        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>Active Backlogs</span>
                          <div style={{ fontSize: "15px", fontWeight: 800, color: (acad.active_backlogs || 0) > 0 ? "#b91c1c" : "#166534", marginTop: "2px" }}>
                            {acad.active_backlogs ?? 0}
                          </div>
                        </div>
                      </div>

                      {/* SGPA Semester History Snapshot */}
                      {acad.sgpa_records && acad.sgpa_records.length > 0 && (
                        <div style={{ marginBottom: "20px" }}>
                          <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#334155" }}>
                            Official Semester SGPA Records at Application
                          </label>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid #e2e8f0" }}>
                            <thead>
                              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>Semester</th>
                                <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>SGPA</th>
                                <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>CGPA</th>
                                <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>Backlogs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {acad.sgpa_records.map((r: any) => (
                                <tr key={r.id || r.semester_no} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "6px 10px", fontWeight: 600 }}>{r.semester_name || `Sem ${r.semester_no}`}</td>
                                  <td style={{ padding: "6px 10px", color: "#1e40af", fontWeight: 700 }}>{Number(r.sgpa).toFixed(2)}</td>
                                  <td style={{ padding: "6px 10px", color: "#047857", fontWeight: 700 }}>{r.cgpa ? Number(r.cgpa).toFixed(2) : "—"}</td>
                                  <td style={{ padding: "6px 10px" }}>{r.backlogs || 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Skills Snapshot */}
                      {snap.skills && (
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Technical Skills Snapshot</label>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {(snap.skills.technical || []).map((sk: string) => (
                              <span key={sk} style={{ padding: "2px 8px", borderRadius: "12px", background: "#eff6ff", color: "#1d4ed8", fontSize: "11px", fontWeight: 600 }}>
                                {sk}
                              </span>
                            ))}
                            {(snap.skills.technical || []).length === 0 && <span style={{ color: "#94a3b8", fontSize: "12px" }}>None recorded</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: RECRUITMENT TIMELINE & AUDIT LOGS */}
            {candidateModalTab === "history" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                    Recruitment Audit Trail &amp; Rounds
                  </label>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => openRoundModal(candidateApp, false)}
                    style={{ padding: "5px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Award size={13} /> Record Round / Score
                  </button>
                </div>

                {loadingHistory ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    Loading audit history...
                  </div>
                ) : candidateAuditHistory.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    No audit records logged yet. Updates to stages or round scores will be recorded here automatically.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {candidateAuditHistory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "10px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            {item.from_status && (
                              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "capitalize" }}>
                                {item.from_status} →
                              </span>
                            )}
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: STAGE_CONFIG[item.to_status]?.bg || "#f1f5f9",
                                color: STAGE_CONFIG[item.to_status]?.color || "#334155",
                              }}
                            >
                              {STAGE_CONFIG[item.to_status]?.label || item.to_status}
                            </span>
                            {item.round_name && (
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "#4f46e5" }}>
                                &bull; {item.round_name}
                              </span>
                            )}
                            {item.score != null && (
                              <span style={{ fontSize: "11px", fontWeight: 800, padding: "1px 6px", background: "#e0e7ff", color: "#4338ca", borderRadius: "4px" }}>
                                {item.score}/100
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <div style={{ fontSize: "12px", color: "#334155", marginTop: "4px" }}>
                              {item.notes}
                            </div>
                          )}
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                            By {item.profiles?.full_name || item.profiles?.email || "University Staff"} &bull; {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stage Updater Bar */}
            <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #e2e8f0" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "8px", color: "#334155" }}>
                Quick Advance Stage
              </label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
                {Object.keys(STAGE_CONFIG).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateCandidateStatus(candidateApp.id, st)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: candidateApp.status === st ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: candidateApp.status === st ? "#dbeafe" : "#fff",
                      color: candidateApp.status === st ? "#1e40af" : "#475569",
                    }}
                  >
                    {STAGE_CONFIG[st].label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => openRoundModal(candidateApp, false)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                >
                  <Award size={14} /> Record Round / Score
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setCandidateModalOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          RECORD ROUND / ASSESSMENT MODAL
      ══════════════════════════════════════════ */}
      {roundModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2003, padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff", borderRadius: "18px", width: "100%", maxWidth: "520px",
              padding: "24px", boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Record Round / Assessment Result</h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  {roundForm.is_bulk
                    ? `Recording for ${selectedAppIds.length} selected candidates`
                    : activeRoundApp?.students?.name || activeRoundApp?.profiles?.full_name || "Candidate"}
                </p>
              </div>
              <button onClick={() => setRoundModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                  Round Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Online Assessment, Technical Interview 1, HR Round"
                  value={roundForm.round_name}
                  onChange={(e) => setRoundForm({ ...roundForm, round_name: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                    Score (0 - 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 85"
                    value={roundForm.score}
                    onChange={(e) => setRoundForm({ ...roundForm, score: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                    Move to Stage
                  </label>
                  <select
                    value={roundForm.to_status}
                    onChange={(e) => setRoundForm({ ...roundForm, to_status: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    {Object.keys(STAGE_CONFIG).map((st) => (
                      <option key={st} value={st}>{STAGE_CONFIG[st].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                  Feedback &amp; Evaluation Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Candidate excelled in data structures and problem solving. Recommended for Technical Interview 2."
                  value={roundForm.notes}
                  onChange={(e) => setRoundForm({ ...roundForm, notes: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setRoundModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={submitRoundResult}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <CheckCircle size={14} /> Save Round Result
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
