"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import StudentCareerProfile from "./StudentCareerProfile";
import {
  evaluateEligibility,
  type EligibilityResult,
  type CheckItemResult,
} from "@/lib/careerEligibility";
import {
  Briefcase,
  Building,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  FileText,
  Globe,
  Linkedin,
  Github,
  Plus,
  X,
  Search,
  ExternalLink,
  ChevronRight,
  User,
  Sparkles,
  Layers,
  Award,
  Check,
  CheckSquare,
  Square,
  HelpCircle,
  History,
  ListFilter,
  SlidersHorizontal,
  Eye,
  RefreshCw,
  FileCheck,
  Info,
  ShieldCheck,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

export type Opportunity = {
  id: string;
  company_name: string;
  company_logo_url?: string | null;
  company_website?: string | null;
  company_description?: string | null;
  title: string;
  type: "internship" | "full_time" | "part_time" | "contract";
  location: string;
  workplace_type: "on_site" | "remote" | "hybrid";
  description: string;
  requirements?: string | null;
  duration?: string | null;
  stipend?: string | null;
  ctc?: string | null;
  salary_range?: string | null;
  deadline: string;
  target_departments?: string[];
  target_batches?: string[];
  min_cgpa?: number;
  min_attendance?: number;
  min_marks_10th?: number | null;
  min_marks_12th?: number | null;
  allow_backlogs?: boolean;
  max_backlogs?: number | null;
  mandatory_skills?: string[];
  preferred_skills?: string[];
  custom_questions?: Array<{
    id: string;
    question: string;
    type: "text" | "long_text" | "yes_no" | "choice";
    required?: boolean;
    options?: string[];
  }>;
  status: "draft" | "published" | "open" | "closed" | "archived";
  created_by?: string;
  created_at: string;
};

export type Application = {
  id: string;
  opportunity_id: string;
  student_profile_id: string;
  student_id?: string | null;
  resume_url: string;
  cv_version_id?: string | null;
  cover_letter?: string | null;
  custom_answers?: Record<string, string>;
  eligibility_status?: "eligible" | "needs_review" | "not_eligible";
  eligibility_reasons?: string[];
  profile_snapshot?: any;
  current_round?: string;
  round_scores?: Record<string, number>;
  withdrawn_at?: string | null;
  withdrawal_reason?: string | null;
  status:
    | "applied"
    | "screening"
    | "shortlisted"
    | "assessment"
    | "interview"
    | "waitlisted"
    | "offered"
    | "rejected"
    | "withdrawn";
  feedback?: string | null;
  applied_at: string;
  opportunity?: Opportunity;
};

export type CvVersion = {
  id: string;
  profile_id: string;
  label: string;
  file_url: string;
  file_name?: string | null;
  is_primary: boolean;
  uploaded_at: string;
};

export type ApplicationHistory = {
  id: string;
  application_id: string;
  changed_by?: string | null;
  changed_by_name?: string | null;
  from_status?: string | null;
  to_status: string;
  round_name?: string | null;
  score?: number | null;
  notes?: string | null;
  created_at: string;
};

export type CareerProfile = {
  id?: string;
  profile_id: string;
  student_id?: string | null;
  phone?: string | null;
  headline?: string | null;
  skills: string[];
  technical_skills?: string[];
  soft_skills?: string[];
  resume_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  bio_summary?: string | null;
  cgpa: number;
  graduation_year?: number | null;
  marks_10th?: number | null;
  marks_12th?: number | null;
  marks_10th_verified?: boolean | null;
  marks_12th_verified?: boolean | null;
  active_backlogs?: number | null;
  total_backlogs?: number | null;
  backlogs_verified?: boolean | null;
};

interface CareerStudentViewProps {
  userProfile: UserProfile;
  notify: (msg: string) => void;
  showError: (msg: string) => void;
}

export default function CareerStudentView({
  userProfile,
  notify,
  showError,
}: CareerStudentViewProps) {
  const [activeTab, setActiveTab] = useState<"opportunities" | "applications" | "profile">("opportunities");
  const [loading, setLoading] = useState(true);

  // Student academic data
  const [studentRecord, setStudentRecord] = useState<any | null>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number>(85);
  const [officialSgpaRecords, setOfficialSgpaRecords] = useState<any[]>([]);

  // Data state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [cvVersions, setCvVersions] = useState<CvVersion[]>([]);
  const [appHistoryMap, setAppHistoryMap] = useState<Record<string, ApplicationHistory[]>>({});

  const [careerProfile, setCareerProfile] = useState<CareerProfile>({
    profile_id: userProfile.id,
    skills: [],
    cgpa: 8.0,
  });

  // Discovery Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterWorkplace, setFilterWorkplace] = useState<string>("all");
  const [filterEligibility, setFilterEligibility] = useState<string>("all");

  // Application Modal state
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [applyResumeUrl, setApplyResumeUrl] = useState("");
  const [applyCoverLetter, setApplyCoverLetter] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);

  // Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);

  // Criteria Breakdown Modal state
  const [breakdownModalOpp, setBreakdownModalOpp] = useState<Opportunity | null>(null);

  // Application Snapshot Modal state
  const [snapshotModalApp, setSnapshotModalApp] = useState<Application | null>(null);

  // Withdrawal Modal state
  const [withdrawalModalApp, setWithdrawalModalApp] = useState<Application | null>(null);
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [userProfile.id]);

  async function loadAllData() {
    setLoading(true);
    try {
      // 1. Fetch student's institutional record
      const { data: sRecord } = await supabase
        .from("students")
        .select("id, student_id, name, department_id, batch_id")
        .eq("profile_id", userProfile.id)
        .maybeSingle();

      if (sRecord) {
        setStudentRecord(sRecord);
        // Calculate attendance percentage
        const { data: attData } = await supabase
          .from("attendance_records")
          .select("status")
          .eq("student_id", sRecord.id);

        if (attData && attData.length > 0) {
          const present = attData.filter((r) => r.status === "P").length;
          setAttendancePercentage(Math.round((present / attData.length) * 100));
        }

        // Fetch official SGPA records
        const { data: sgpaData } = await supabase
          .from("student_sgpa_records")
          .select("semester_no, sgpa, cgpa, backlogs")
          .eq("student_id", sRecord.id)
          .order("semester_no", { ascending: true });

        if (sgpaData) {
          setOfficialSgpaRecords(sgpaData);
        }
      }

      // 2. Fetch Career Profile
      const { data: profData } = await supabase
        .from("student_career_profiles")
        .select("*")
        .eq("profile_id", userProfile.id)
        .maybeSingle();

      if (profData) {
        setCareerProfile({
          ...profData,
          skills: profData.technical_skills?.length ? profData.technical_skills : profData.skills || [],
          cgpa: profData.cgpa || 8.0,
        });
        setApplyResumeUrl(profData.resume_url || "");
      }

      // 3. Fetch Uploaded CV Versions
      const { data: cvData } = await supabase
        .from("career_cv_versions")
        .select("*")
        .eq("profile_id", userProfile.id)
        .order("is_primary", { ascending: false });

      if (cvData) {
        setCvVersions(cvData);
        const primary = cvData.find((cv) => cv.is_primary);
        if (primary) {
          setSelectedCvId(primary.id);
          setApplyResumeUrl(primary.file_url);
        }
      }

      // 4. Fetch Open Career Opportunities
      const { data: oppsData, error: oppsError } = await supabase
        .from("career_opportunities")
        .select("*")
        .in("status", ["published", "open", "closed"])
        .order("deadline", { ascending: true });

      if (oppsError) {
        console.warn("Could not load opportunities from database:", oppsError.message);
      } else if (oppsData) {
        setOpportunities(oppsData as Opportunity[]);
      }

      // 5. Fetch Student's Applications
      const { data: appsData, error: appsError } = await supabase
        .from("career_applications")
        .select(`
          id,
          opportunity_id,
          student_profile_id,
          student_id,
          resume_url,
          cv_version_id,
          cover_letter,
          custom_answers,
          eligibility_status,
          eligibility_reasons,
          profile_snapshot,
          current_round,
          round_scores,
          withdrawn_at,
          withdrawal_reason,
          status,
          feedback,
          applied_at,
          career_opportunities (*)
        `)
        .eq("student_profile_id", userProfile.id)
        .order("applied_at", { ascending: false });

      if (appsError) {
        console.warn("Could not load applications:", appsError.message);
      } else if (appsData) {
        const formatted = appsData.map((a: any) => ({
          ...a,
          opportunity: a.career_opportunities,
        }));
        setApplications(formatted);

        // 6. Fetch Application History Timeline for all applications
        const appIds = formatted.map((a: any) => a.id);
        if (appIds.length > 0) {
          const { data: histData } = await supabase
            .from("career_application_history")
            .select("*")
            .in("application_id", appIds)
            .order("created_at", { ascending: true });

          if (histData) {
            const hMap: Record<string, ApplicationHistory[]> = {};
            histData.forEach((h: any) => {
              if (!hMap[h.application_id]) hMap[h.application_id] = [];
              hMap[h.application_id].push(h);
            });
            setAppHistoryMap(hMap);
          }
        }
      }
    } catch (err: any) {
      console.error("Error loading career data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Check if student has already applied
  function getExistingApplication(oppId: string): Application | undefined {
    return applications.find((a) => a.opportunity_id === oppId);
  }

  // Open Application Modal
  function handleOpenApply(opp: Opportunity) {
    setSelectedOpp(opp);
    const primaryCv = cvVersions.find((cv) => cv.is_primary);
    if (primaryCv) {
      setSelectedCvId(primaryCv.id);
      setApplyResumeUrl(primaryCv.file_url);
    } else {
      setSelectedCvId("");
      setApplyResumeUrl(careerProfile.resume_url || "");
    }
    setApplyCoverLetter("");
    setCustomAnswers({});
    setConfirmAccuracy(false);
    setModalOpen(true);
  }

  // Proceed to Application Confirmation Modal
  function handleReviewApplication() {
    if (!selectedOpp) return;

    if (!applyResumeUrl) {
      showError("Please select an uploaded CV version or provide a resume link");
      return;
    }

    // Validate custom questions if any
    if (selectedOpp.custom_questions && selectedOpp.custom_questions.length > 0) {
      for (const q of selectedOpp.custom_questions) {
        if (q.required && (!customAnswers[q.id] || customAnswers[q.id].trim() === "")) {
          showError(`Please answer required question: "${q.question}"`);
          return;
        }
      }
    }

    setConfirmAccuracy(false);
    setConfirmModalOpen(true);
  }

  // Submit Application via Server-side API with Deterministic Verification
  async function submitApplicationFinal() {
    if (!selectedOpp) return;
    if (!confirmAccuracy) {
      showError("Please verify and check the confirmation box before submitting.");
      return;
    }

    setApplying(true);
    try {
      const response = await fetch("/api/career/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: selectedOpp.id,
          student_profile_id: userProfile.id,
          cv_version_id: selectedCvId || null,
          resume_url: applyResumeUrl,
          cover_letter: applyCoverLetter.trim() || null,
          custom_answers: customAnswers,
        }),
      });

      const resJson = await response.json();

      if (!response.ok) {
        if (resJson.reasons && resJson.reasons.length > 0) {
          showError(`Eligibility Check Failed: ${resJson.reasons.join(". ")}`);
        } else {
          showError(resJson.error || "Failed to submit application");
        }
        return;
      }

      notify(`Application for ${selectedOpp.title} at ${selectedOpp.company_name} submitted successfully!`);
      setConfirmModalOpen(false);
      setModalOpen(false);

      // Reload applications
      await loadAllData();
      setActiveTab("applications");
    } catch (err: any) {
      showError(err.message || "Failed to submit application.");
    } finally {
      setApplying(false);
    }
  }

  // Open Withdrawal Prompt Modal
  function handleOpenWithdraw(app: Application) {
    setWithdrawalModalApp(app);
    setWithdrawalReason("");
  }

  // Submit Application Withdrawal via Server-side API
  async function submitWithdrawal() {
    if (!withdrawalModalApp) return;

    setWithdrawing(true);
    try {
      const response = await fetch("/api/career/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: withdrawalModalApp.id,
          student_profile_id: userProfile.id,
          reason: withdrawalReason.trim() || "Withdrawn by candidate",
        }),
      });

      const resJson = await response.json();
      if (!response.ok) {
        showError(resJson.error || "Failed to withdraw application");
        return;
      }

      notify("Application withdrawn successfully.");
      setWithdrawalModalApp(null);
      await loadAllData();
    } catch (err: any) {
      showError(err.message || "Failed to withdraw application.");
    } finally {
      setWithdrawing(false);
    }
  }

  // Evaluate all opportunities deterministically
  const oppEvaluations = useMemo(() => {
    const map = new Map<string, EligibilityResult>();
    opportunities.forEach((opp) => {
      const result = evaluateEligibility({
        opportunity: opp,
        student: studentRecord,
        careerProfile,
        officialSgpaRecords,
        attendancePercentage,
      });
      map.set(opp.id, result);
    });
    return map;
  }, [opportunities, studentRecord, careerProfile, officialSgpaRecords, attendancePercentage]);

  // Filtered Opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || opp.type === filterType;
    const matchesWorkplace =
      filterWorkplace === "all" || opp.workplace_type === filterWorkplace;

    const evaluation = oppEvaluations.get(opp.id);
    let matchesEligibility = true;
    if (filterEligibility === "eligible") {
      matchesEligibility = evaluation?.status === "eligible";
    } else if (filterEligibility === "needs_review") {
      matchesEligibility = evaluation?.status === "needs_review";
    } else if (filterEligibility === "not_eligible") {
      matchesEligibility = evaluation?.status === "not_eligible";
    }

    return matchesSearch && matchesType && matchesWorkplace && matchesEligibility;
  });

  const activeAppsCount = applications.filter(
    (a) => a.status !== "rejected" && a.status !== "withdrawn"
  ).length;

  return (
    <div className="career-student-view" style={{ animation: "fadeIn 0.25s ease-in-out" }}>
      {/* ============================================================
          TOP HEADER & NAVIGATION
      ============================================================ */}
      <div className="panel" style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Briefcase size={26} color="var(--theme-accent, #3b82f6)" />
              Career & Placement Hub
            </h1>
            <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "14px" }}>
              Explore campus drives, verified internships, and placement opportunities
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={activeTab === "opportunities" ? "primary-btn" : "secondary-btn"}
              onClick={() => setActiveTab("opportunities")}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Building size={16} />
              Opportunities
            </button>
            <button
              className={activeTab === "applications" ? "primary-btn" : "secondary-btn"}
              onClick={() => setActiveTab("applications")}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Send size={16} />
              My Applications ({applications.length})
            </button>
            <button
              className={activeTab === "profile" ? "primary-btn" : "secondary-btn"}
              onClick={() => setActiveTab("profile")}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <User size={16} />
              Career Profile
            </button>
          </div>
        </div>

        {/* Academic Eligibility Banner */}
        <div
          style={{
            marginTop: "18px",
            padding: "12px 18px",
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--theme-accent, #3b82f6)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              TIU
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                {studentRecord?.name || userProfile.full_name || "Enrolled Student"}
                {studentRecord?.student_id && (
                  <span style={{ marginLeft: "8px", color: "#64748b", fontWeight: 500 }}>
                    ({studentRecord.student_id})
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Attendance: <strong>{attendancePercentage}%</strong> &bull; CGPA:{" "}
                <strong>
                  {careerProfile.cgpa ? careerProfile.cgpa.toFixed(2) : "N/A"}
                </strong>{" "}
                &bull; 10th Marks:{" "}
                <strong>
                  {careerProfile.marks_10th != null ? `${careerProfile.marks_10th}%` : "—"}
                </strong>{" "}
                {careerProfile.marks_10th_verified && (
                  <span style={{ color: "#16a34a", fontSize: "11px" }}>[Verified]</span>
                )}
                {" "}&bull; Active Backlogs:{" "}
                <strong>{careerProfile.active_backlogs ?? 0}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                background: attendancePercentage >= 75 ? "#dcfce7" : "#fee2e2",
                color: attendancePercentage >= 75 ? "#166534" : "#991b1b",
              }}
            >
              {attendancePercentage >= 75 ? "✓ Attendance Criteria Met" : "⚠ Low Attendance (<75%)"}
            </span>
            {cvVersions.length > 0 && (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                }}
              >
                📄 {cvVersions.length} CV Version{cvVersions.length > 1 ? "s" : ""} Available
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          TAB 1: BROWSE OPPORTUNITIES
      ============================================================ */}
      {activeTab === "opportunities" && (
        <>
          {/* Quick Metrics */}
          <div className="metrics-grid" style={{ marginBottom: "20px" }}>
            <div className="metric-card">
              <div className="metric-num">{opportunities.length}</div>
              <div className="metric-label">Active Drives</div>
            </div>
            <div className="metric-card">
              <div className="metric-num" style={{ color: "#16a34a" }}>
                {
                  opportunities.filter(
                    (o) => oppEvaluations.get(o.id)?.status === "eligible"
                  ).length
                }
              </div>
              <div className="metric-label">Fully Eligible</div>
            </div>
            <div className="metric-card">
              <div className="metric-num" style={{ color: "#d97706" }}>
                {
                  opportunities.filter(
                    (o) => oppEvaluations.get(o.id)?.status === "needs_review"
                  ).length
                }
              </div>
              <div className="metric-label">Needs Review</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">{activeAppsCount}</div>
              <div className="metric-label">Applications in Pipeline</div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="panel" style={{ padding: "18px 24px", marginBottom: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, 2fr) minmax(130px, 1fr) minmax(130px, 1fr) minmax(140px, 1.2fr)",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by job title, company, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "36px" }}
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Employment Types</option>
                <option value="internship">Internship</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
              </select>

              <select
                value={filterWorkplace}
                onChange={(e) => setFilterWorkplace(e.target.value)}
              >
                <option value="all">All Work Modes</option>
                <option value="on_site">On-site</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>

              <select
                value={filterEligibility}
                onChange={(e) => setFilterEligibility(e.target.value)}
                style={{ fontWeight: 600, color: "#1e293b" }}
              >
                <option value="all">Filter: All Eligibility</option>
                <option value="eligible">✓ Eligible Only</option>
                <option value="needs_review">⚠ Needs Review</option>
                <option value="not_eligible">✕ Ineligible Only</option>
              </select>
            </div>
          </div>

          {/* Opportunities Grid */}
          {filteredOpportunities.length === 0 ? (
            <div className="panel" style={{ textAlign: "center", padding: "60px 20px" }}>
              <Briefcase size={44} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
              <h3 style={{ margin: "0 0 6px", color: "#334155" }}>No Opportunities Found</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                Try adjusting your search criteria or eligibility filter to see more active recruitment drives.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: "20px",
              }}
            >
              {filteredOpportunities.map((opp) => {
                const evaluation = oppEvaluations.get(opp.id) || {
                  status: "eligible" as const,
                  isEligible: true,
                  canApply: true,
                  reasons: [],
                  reviewReasons: [],
                  matchedMandatorySkills: [],
                  missingMandatorySkills: [],
                  matchedPreferredSkills: [],
                  missingPreferredSkills: [],
                  effectiveCgpa: 8.0,
                  score: 100,
                  checks: [],
                };

                const existingApp = getExistingApplication(opp.id);
                const deadlineDate = new Date(opp.deadline);
                const daysRemaining = Math.ceil(
                  (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                const isEligible = evaluation.status === "eligible";
                const isNeedsReview = evaluation.status === "needs_review";

                return (
                  <div
                    key={opp.id}
                    className="panel"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      border: existingApp
                        ? "1px solid #bfdbfe"
                        : isEligible
                        ? "1px solid #bbf7d0"
                        : isNeedsReview
                        ? "1px solid #fde68a"
                        : "1px solid #fecaca",
                      position: "relative",
                      margin: 0,
                    }}
                  >
                    <div>
                      {/* Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "10px",
                              background: "#f1f5f9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              color: "#475569",
                              fontSize: "16px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {opp.company_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                              {opp.title}
                            </h3>
                            <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                              {opp.company_name}
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background:
                              opp.type === "internship"
                                ? "#fef3c7"
                                : opp.type === "full_time"
                                ? "#dbeafe"
                                : "#f3e8ff",
                            color:
                              opp.type === "internship"
                                ? "#92400e"
                                : opp.type === "full_time"
                                ? "#1e40af"
                                : "#6b21a8",
                          }}
                        >
                          {opp.type.replace("_", " ")}
                        </span>
                      </div>

                      {/* Job Metadata Tags */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "10px",
                          fontSize: "12px",
                          color: "#64748b",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={14} />
                          <span>
                            {opp.location} ({opp.workplace_type.replace("_", "-")})
                          </span>
                        </div>
                        {(opp.ctc || opp.stipend || opp.salary_range) && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#047857", fontWeight: 600 }}>
                            <DollarSign size={14} />
                            <span>{opp.ctc ? `CTC: ${opp.ctc}` : opp.stipend ? `Stipend: ${opp.stipend}` : opp.salary_range}</span>
                          </div>
                        )}
                        {opp.duration && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={14} />
                            <span>{opp.duration}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={14} />
                          <span>
                            {daysRemaining > 0
                              ? `${daysRemaining} days left`
                              : daysRemaining === 0
                              ? "Ends Today"
                              : "Expired"}
                          </span>
                        </div>
                      </div>

                      {/* Mandatory Skills */}
                      {opp.mandatory_skills && opp.mandatory_skills.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
                          {opp.mandatory_skills.slice(0, 4).map((s, idx) => (
                            <span key={idx} style={{ fontSize: "11px", padding: "2px 8px", background: "#f1f5f9", borderRadius: "12px", color: "#334155", fontWeight: 600 }}>
                              {s}
                            </span>
                          ))}
                          {opp.mandatory_skills.length > 4 && (
                            <span style={{ fontSize: "11px", color: "#94a3b8", alignSelf: "center" }}>
                              +{opp.mandatory_skills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Brief Description */}
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#475569",
                          lineHeight: "1.5",
                          margin: "0 0 14px",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {opp.description}
                      </p>

                      {/* Deterministic Eligibility Indicator */}
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          marginBottom: "14px",
                          background: existingApp
                            ? "#eff6ff"
                            : isEligible
                            ? "#f0fdf4"
                            : isNeedsReview
                            ? "#fffbeb"
                            : "#fef2f2",
                          color: existingApp
                            ? "#1e40af"
                            : isEligible
                            ? "#166534"
                            : isNeedsReview
                            ? "#92400e"
                            : "#991b1b",
                          border: `1px solid ${
                            existingApp
                              ? "#bfdbfe"
                              : isEligible
                              ? "#bbf7d0"
                              : isNeedsReview
                              ? "#fde68a"
                              : "#fecaca"
                          }`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                            {existingApp ? (
                              <>
                                <CheckCircle size={15} />
                                <span>Applied ({existingApp.status.toUpperCase()})</span>
                              </>
                            ) : isEligible ? (
                              <>
                                <CheckCircle size={15} />
                                <span>Eligible ({evaluation.score}% Match)</span>
                              </>
                            ) : isNeedsReview ? (
                              <>
                                <AlertTriangle size={15} />
                                <span>Needs Review ({evaluation.score}% Match)</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={15} />
                                <span>Not Eligible</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setBreakdownModalOpp(opp)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              fontSize: "11px",
                              color: "inherit",
                              fontWeight: 700,
                              textDecoration: "underline",
                            }}
                          >
                            Criteria Breakdown &rarr;
                          </button>
                        </div>
                        <div style={{ fontSize: "11px", lineHeight: "1.4" }}>
                          {existingApp
                            ? `Submitted on ${new Date(existingApp.applied_at).toLocaleDateString()} • Stage: ${existingApp.status}`
                            : isEligible
                            ? "Satisfies department, batch, CGPA, marks, and mandatory skill requirements."
                            : isNeedsReview
                            ? evaluation.reviewReasons[0] || "Meets baseline criteria but requires coordinator review."
                            : evaluation.reasons[0] || "Does not satisfy minimum eligibility requirements."}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      style={{
                        paddingTop: "12px",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="secondary-btn"
                        onClick={() => handleOpenApply(opp)}
                        style={{ padding: "8px 14px", fontSize: "13px" }}
                      >
                        Details
                      </button>

                      {existingApp ? (
                        <button
                          className="secondary-btn"
                          onClick={() => setActiveTab("applications")}
                          style={{
                            padding: "8px 14px",
                            fontSize: "13px",
                            color: "#2563eb",
                            fontWeight: 600,
                          }}
                        >
                          Track Status &rarr;
                        </button>
                      ) : (
                        <button
                          className="primary-btn"
                          disabled={!evaluation.canApply}
                          onClick={() => handleOpenApply(opp)}
                          style={{
                            padding: "8px 18px",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            opacity: evaluation.canApply ? 1 : 0.6,
                            cursor: evaluation.canApply ? "pointer" : "not-allowed",
                          }}
                        >
                          <Send size={14} />
                          {isNeedsReview ? "Apply (Review Req.)" : "Apply Now"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================================
          TAB 2: MY APPLICATIONS & RECRUITMENT TIMELINE
      ============================================================ */}
      {activeTab === "applications" && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>My Recruitment Pipeline & History</h2>
              <p>Track your applications, round-wise assessment results, and audit timeline in real time</p>
            </div>
          </div>

          {applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <FileText size={48} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
              <h3 style={{ margin: "0 0 6px", color: "#334155" }}>No Applications Submitted Yet</h3>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "14px" }}>
                Browse active opportunities, verify eligibility, and submit your profile.
              </p>
              <button
                className="primary-btn"
                onClick={() => setActiveTab("opportunities")}
              >
                Browse Active Opportunities
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {applications.map((app) => {
                const opp = app.opportunity;
                const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                  applied: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
                  screening: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
                  shortlisted: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
                  assessment: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
                  interview: { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" },
                  waitlisted: { bg: "#fff7ed", text: "#c2410c", border: "#ffedd5" },
                  offered: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
                  rejected: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
                  withdrawn: { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" },
                };
                const config = statusColors[app.status] || statusColors.applied;
                const historyLogs = appHistoryMap[app.id] || [];
                const canWithdraw =
                  app.status === "applied" ||
                  app.status === "screening" ||
                  app.status === "shortlisted";

                return (
                  <div
                    key={app.id}
                    style={{
                      border: `1px solid ${config.border}`,
                      borderRadius: "14px",
                      padding: "22px",
                      background: "#ffffff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                            {opp?.title || "Placement Role"}
                          </h3>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background: config.bg,
                              color: config.text,
                              border: `1px solid ${config.border}`,
                            }}
                          >
                            {app.status}
                          </span>
                          {app.eligibility_status && (
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "8px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background:
                                  app.eligibility_status === "eligible"
                                    ? "#dcfce7"
                                    : app.eligibility_status === "needs_review"
                                    ? "#fef3c7"
                                    : "#fee2e2",
                                color:
                                  app.eligibility_status === "eligible"
                                    ? "#166534"
                                    : app.eligibility_status === "needs_review"
                                    ? "#92400e"
                                    : "#991b1b",
                              }}
                            >
                              Verified: {app.eligibility_status.replace("_", " ").toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
                          {opp?.company_name} &bull; Applied on{" "}
                          {new Date(app.applied_at).toLocaleDateString()}
                          {app.current_round && (
                            <span style={{ marginLeft: "8px", color: "#0f172a", fontWeight: 600 }}>
                              &bull; Current Round: {app.current_round}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        {app.profile_snapshot && (
                          <button
                            className="secondary-btn"
                            onClick={() => setSnapshotModalApp(app)}
                            style={{ fontSize: "12px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <FileCheck size={14} /> View Snapshot
                          </button>
                        )}
                        {canWithdraw && (
                          <button
                            className="secondary-btn"
                            onClick={() => handleOpenWithdraw(app)}
                            style={{ fontSize: "12px", padding: "6px 12px", color: "#ef4444" }}
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Pipeline Stepper */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: "8px",
                        margin: "16px 0",
                        padding: "14px 16px",
                        background: "#f8fafc",
                        borderRadius: "12px",
                      }}
                    >
                      {[
                        { label: "Applied", step: "applied" },
                        { label: "Screening", step: "screening" },
                        { label: "Assessment", step: "assessment" },
                        { label: "Interview", step: "interview" },
                        { label: "Decision", step: "offered" },
                      ].map((s, idx) => {
                        const stepOrder = ["applied", "screening", "assessment", "interview", "offered"];
                        const currentIdx = stepOrder.indexOf(app.status);
                        const isDone = currentIdx >= idx;
                        const isFailed = app.status === "rejected" && idx === currentIdx;

                        return (
                          <div
                            key={s.step}
                            style={{
                              textAlign: "center",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                background: isFailed
                                  ? "#ef4444"
                                  : isDone
                                  ? "#22c55e"
                                  : "#cbd5e1",
                                color: "#fff",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 6px",
                              }}
                            >
                              {isDone ? "✓" : idx + 1}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: isDone ? 700 : 500,
                                color: isDone ? "#1e293b" : "#94a3b8",
                              }}
                            >
                              {s.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Withdrawal Notice */}
                    {app.status === "withdrawn" && (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "#f1f5f9",
                          fontSize: "13px",
                          color: "#64748b",
                          marginBottom: "12px",
                        }}
                      >
                        <strong>Application Withdrawn:</strong>{" "}
                        {app.withdrawal_reason || "Withdrawn by candidate"} on{" "}
                        {app.withdrawn_at ? new Date(app.withdrawn_at).toLocaleDateString() : "—"}
                      </div>
                    )}

                    {/* Recruiter / Placement Coordinator Feedback */}
                    {app.feedback && (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          background: "#fffbeb",
                          border: "1px solid #fef3c7",
                          fontSize: "13px",
                          color: "#92400e",
                          marginBottom: "12px",
                        }}
                      >
                        <strong>Coordinator / Recruiter Note:</strong> {app.feedback}
                      </div>
                    )}

                    {/* Audit Trail Timeline Accordion */}
                    {historyLogs.length > 0 && (
                      <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                          <History size={14} /> Recruitment Audit Timeline ({historyLogs.length} events)
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {historyLogs.map((h) => (
                            <div
                              key={h.id}
                              style={{
                                fontSize: "12px",
                                padding: "6px 10px",
                                background: "#f8fafc",
                                borderRadius: "6px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "8px",
                              }}
                            >
                              <div>
                                <strong style={{ color: "#1e293b" }}>{h.round_name || h.to_status}</strong>{" "}
                                &bull; <span style={{ color: "#64748b" }}>{h.notes || `Updated to ${h.to_status}`}</span>
                                {h.score != null && (
                                  <span style={{ marginLeft: "6px", color: "#16a34a", fontWeight: 700 }}>
                                    (Score: {h.score})
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                                {new Date(h.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resume link attached */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "12px",
                        fontSize: "13px",
                      }}
                    >
                      <FileText size={15} color="#64748b" />
                      <span style={{ color: "#64748b" }}>Submitted CV:</span>
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "var(--theme-accent, #2563eb)",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Preview Selected CV <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 3: FULL STUDENT CAREER PROFILE
      ============================================================ */}
      {activeTab === "profile" && (
        <StudentCareerProfile
          userProfile={userProfile}
          notify={notify}
          showError={showError}
        />
      )}

      {/* ============================================================
          APPLICATION SUBMISSION MODAL
      ============================================================ */}
      {modalOpen && selectedOpp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--theme-accent, #2563eb)",
                  }}
                >
                  {selectedOpp.company_name}
                </span>
                <h2 style={{ margin: "4px 0", fontSize: "20px", fontWeight: 800 }}>
                  {selectedOpp.title}
                </h2>
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  {selectedOpp.location} &bull; {selectedOpp.workplace_type.replace("_", "-")}{" "}
                  &bull; {selectedOpp.type.replace("_", " ")}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Quick Details Chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              {(selectedOpp.ctc || selectedOpp.stipend || selectedOpp.salary_range) && (
                <div>
                  <strong>Package:</strong>{" "}
                  {selectedOpp.ctc ? `CTC: ${selectedOpp.ctc}` : selectedOpp.stipend ? `Stipend: ${selectedOpp.stipend}` : selectedOpp.salary_range}
                </div>
              )}
              <div>
                <strong>Deadline:</strong>{" "}
                {new Date(selectedOpp.deadline).toLocaleDateString()}
              </div>
              {selectedOpp.min_cgpa ? (
                <div>
                  <strong>Min CGPA:</strong> {selectedOpp.min_cgpa}
                </div>
              ) : null}
              {selectedOpp.min_marks_10th ? (
                <div>
                  <strong>Min 10th:</strong> {selectedOpp.min_marks_10th}%
                </div>
              ) : null}
              {selectedOpp.min_marks_12th ? (
                <div>
                  <strong>Min 12th:</strong> {selectedOpp.min_marks_12th}%
                </div>
              ) : null}
            </div>

            {/* Role Description */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700 }}>
                Role Description
              </h4>
              <p
                style={{
                  fontSize: "14px",
                  color: "#475569",
                  lineHeight: "1.6",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {selectedOpp.description}
              </p>
            </div>

            <hr style={{ border: "0", borderTop: "1px solid #f1f5f9", margin: "20px 0" }} />

            {/* Application Form */}
            <div>
              <h4 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 700 }}>
                Submit Your Application
              </h4>

              {/* CV Selection (from uploaded career_cv_versions or direct url) */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "8px" }}>
                  Select CV / Resume Version *
                </label>
                {cvVersions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                    {cvVersions.map((cv) => {
                      const isSelected = selectedCvId === cv.id || applyResumeUrl === cv.file_url;
                      return (
                        <div
                          key={cv.id}
                          onClick={() => {
                            setSelectedCvId(cv.id);
                            setApplyResumeUrl(cv.file_url);
                          }}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: `1.5px solid ${isSelected ? "#2563eb" : "#e2e8f0"}`,
                            background: isSelected ? "#eff6ff" : "#f8fafc",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {isSelected ? <CheckSquare size={16} color="#2563eb" /> : <Square size={16} color="#94a3b8" />}
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                                {cv.label}{" "}
                                {cv.is_primary && (
                                  <span style={{ fontSize: "11px", color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>
                                    Primary
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                Uploaded on {new Date(cv.uploaded_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <a
                            href={cv.file_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: "12px", color: "#2563eb", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            Preview <ExternalLink size={12} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", marginBottom: "10px", fontSize: "12px", color: "#64748b" }}>
                    No multi-version CVs uploaded yet. You can upload multiple versions in your Career Profile.
                  </div>
                )}

                {/* Direct Link Input */}
                <input
                  type="url"
                  placeholder="Or paste external Google Drive / cloud resume URL..."
                  value={applyResumeUrl}
                  onChange={(e) => {
                    setSelectedCvId("");
                    setApplyResumeUrl(e.target.value);
                  }}
                  required
                />
              </div>

              {/* Cover note */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                  Optional Note to Recruiter / Cover Letter
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly state why you're a great fit for this position..."
                  value={applyCoverLetter}
                  onChange={(e) => setApplyCoverLetter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d0d5dd",
                    fontFamily: "inherit",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Custom Screening Questions */}
              {selectedOpp.custom_questions && selectedOpp.custom_questions.length > 0 && (
                <div style={{ marginBottom: "20px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                    Company Screening Questions
                  </h4>
                  {selectedOpp.custom_questions.map((q, idx) => (
                    <div key={q.id || idx} style={{ marginBottom: "14px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px", color: "#334155" }}>
                        {idx + 1}. {q.question} {q.required && <span style={{ color: "#e11d48" }}>*</span>}
                      </label>
                      {q.type === "long_text" ? (
                        <textarea
                          rows={3}
                          placeholder="Your answer..."
                          value={customAnswers[q.id] || ""}
                          onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontFamily: "inherit",
                            fontSize: "13px",
                          }}
                        />
                      ) : q.type === "choice" && q.options && q.options.length > 0 ? (
                        <select
                          value={customAnswers[q.id] || ""}
                          onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                          }}
                        >
                          <option value="">-- Select an option --</option>
                          {q.options.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : q.type === "yes_no" ? (
                        <div style={{ display: "flex", gap: "20px", marginTop: "4px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value="Yes"
                              checked={customAnswers[q.id] === "Yes"}
                              onChange={() => setCustomAnswers({ ...customAnswers, [q.id]: "Yes" })}
                            />
                            Yes
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value="No"
                              checked={customAnswers[q.id] === "No"}
                              onChange={() => setCustomAnswers({ ...customAnswers, [q.id]: "No" })}
                            />
                            No
                          </label>
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Your answer..."
                          value={customAnswers[q.id] || ""}
                          onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!applyResumeUrl}
                  onClick={handleReviewApplication}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span>Review & Confirm Application</span> &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          APPLICATION CONFIRMATION MODAL (SNAPSHOT SUMMARY)
      ============================================================ */}
      {confirmModalOpen && selectedOpp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "26px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                Confirm Application Submission
              </h3>
              <button onClick={() => setConfirmModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              An immutable snapshot of your academic profile and selected CV will be stored for the recruiter at <strong>{selectedOpp.company_name}</strong>.
            </p>

            {/* Profile Snapshot Summary */}
            <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px", fontSize: "13px" }}>
              <div style={{ fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>
                Academic Snapshot Preview
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>Student Name: <strong>{studentRecord?.name || userProfile.full_name}</strong></div>
                <div>Roll No: <strong>{studentRecord?.student_id || "—"}</strong></div>
                <div>CGPA: <strong>{careerProfile.cgpa ? careerProfile.cgpa.toFixed(2) : "N/A"}</strong></div>
                <div>Attendance: <strong>{attendancePercentage}%</strong></div>
                <div>10th Marks: <strong>{careerProfile.marks_10th != null ? `${careerProfile.marks_10th}%` : "—"}</strong></div>
                <div>12th Marks: <strong>{careerProfile.marks_12th != null ? `${careerProfile.marks_12th}%` : "—"}</strong></div>
                <div>Active Backlogs: <strong>{careerProfile.active_backlogs ?? 0}</strong></div>
                <div>Selected CV: <strong style={{ color: "#2563eb" }}>{cvVersions.find((c) => c.id === selectedCvId)?.label || "Custom Link"}</strong></div>
              </div>
            </div>

            {/* Screening Answers Summary */}
            {selectedOpp.custom_questions && selectedOpp.custom_questions.length > 0 && (
              <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px", fontSize: "13px" }}>
                <div style={{ fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>
                  Screening Question Answers ({Object.keys(customAnswers).length})
                </div>
                {selectedOpp.custom_questions.map((q) => (
                  <div key={q.id} style={{ marginBottom: "6px" }}>
                    <span style={{ color: "#64748b" }}>{q.question}:</span>{" "}
                    <strong>{customAnswers[q.id] || "—"}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                <input
                  type="checkbox"
                  checked={confirmAccuracy}
                  onChange={(e) => setConfirmAccuracy(e.target.checked)}
                  style={{ marginTop: "3px" }}
                />
                <span>I confirm that all submitted academic and professional information is accurate and verified by institutional records.</span>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setConfirmModalOpen(false)}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={applying || !confirmAccuracy}
                onClick={submitApplicationFinal}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <CheckCircle size={15} />
                {applying ? "Submitting..." : "Confirm & Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          CRITERIA BREAKDOWN MODAL
      ============================================================ */}
      {breakdownModalOpp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1002,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "620px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "26px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                  Eligibility Evaluation Breakdown
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800 }}>
                  {breakdownModalOpp.title} &bull; {breakdownModalOpp.company_name}
                </h3>
              </div>
              <button onClick={() => setBreakdownModalOpp(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={20} />
              </button>
            </div>

            {/* Overall status badge */}
            {(() => {
              const evalRes = oppEvaluations.get(breakdownModalOpp.id);
              if (!evalRes) return null;
              return (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    marginBottom: "18px",
                    background:
                      evalRes.status === "eligible"
                        ? "#f0fdf4"
                        : evalRes.status === "needs_review"
                        ? "#fffbeb"
                        : "#fef2f2",
                    color:
                      evalRes.status === "eligible"
                        ? "#166534"
                        : evalRes.status === "needs_review"
                        ? "#92400e"
                        : "#991b1b",
                    border: `1px solid ${
                      evalRes.status === "eligible"
                        ? "#bbf7d0"
                        : evalRes.status === "needs_review"
                        ? "#fde68a"
                        : "#fecaca"
                    }`,
                    fontWeight: 700,
                    fontSize: "13px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    Status: {evalRes.status.toUpperCase().replace("_", " ")}
                  </span>
                  <span>Match Score: {evalRes.score}/100</span>
                </div>
              );
            })()}

            {/* Detailed checks table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "8px 12px" }}>Evaluation Criterion</th>
                    <th style={{ padding: "8px 12px" }}>Status</th>
                    <th style={{ padding: "8px 12px" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {oppEvaluations.get(breakdownModalOpp.id)?.checks.map((chk, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{chk.name}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {chk.passed ? (
                          chk.needsReview ? (
                            <span style={{ color: "#d97706", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                              <AlertTriangle size={14} /> Review
                            </span>
                          ) : (
                            <span style={{ color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                              <CheckCircle size={14} /> Met
                            </span>
                          )
                        ) : (
                          <span style={{ color: "#dc2626", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                            <XCircle size={14} /> Not Met
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#475569", fontSize: "12px" }}>
                        {chk.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setBreakdownModalOpp(null)}
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW APPLICATION SNAPSHOT MODAL
      ============================================================ */}
      {snapshotModalApp && snapshotModalApp.profile_snapshot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1002,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "640px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "26px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                  Application Snapshot
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800 }}>
                  {snapshotModalApp.opportunity?.title} &bull; {snapshotModalApp.opportunity?.company_name}
                </h3>
              </div>
              <button onClick={() => setSnapshotModalApp(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
              Captured on: {new Date(snapshotModalApp.profile_snapshot.snapshot_timestamp || snapshotModalApp.applied_at).toLocaleString()}
            </div>

            {/* Academic Snapshot */}
            <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "14px", fontSize: "13px" }}>
              <div style={{ fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>Academic Record Snapshot</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div>Effective CGPA: <strong>{snapshotModalApp.profile_snapshot.academic_metrics?.effective_cgpa ?? "—"}</strong></div>
                <div>Attendance: <strong>{snapshotModalApp.profile_snapshot.academic_metrics?.attendance_percentage}%</strong></div>
                <div>10th Marks: <strong>{snapshotModalApp.profile_snapshot.academic_metrics?.marks_10th ?? "—"}%</strong></div>
                <div>12th Marks: <strong>{snapshotModalApp.profile_snapshot.academic_metrics?.marks_12th ?? "—"}%</strong></div>
                <div>Active Backlogs: <strong>{snapshotModalApp.profile_snapshot.academic_metrics?.active_backlogs ?? 0}</strong></div>
                <div>CV Used: <strong>{snapshotModalApp.profile_snapshot.submitted_cv?.label || "Resume"}</strong></div>
              </div>
            </div>

            {/* Submitted Answers */}
            {snapshotModalApp.profile_snapshot.custom_answers && Object.keys(snapshotModalApp.profile_snapshot.custom_answers).length > 0 && (
              <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "14px", fontSize: "13px" }}>
                <div style={{ fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>Submitted Screening Responses</div>
                {Object.entries(snapshotModalApp.profile_snapshot.custom_answers).map(([qid, ans]) => (
                  <div key={qid} style={{ marginBottom: "6px" }}>
                    <span style={{ color: "#64748b" }}>Response:</span> <strong>{String(ans)}</strong>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSnapshotModalApp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          APPLICATION WITHDRAWAL MODAL
      ============================================================ */}
      {withdrawalModalApp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1002,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "480px",
              padding: "26px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "#b91c1c" }}>
              Withdraw Application
            </h3>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 14px", lineHeight: "1.5" }}>
              Are you sure you want to withdraw your application for{" "}
              <strong>{withdrawalModalApp.opportunity?.title}</strong> at{" "}
              <strong>{withdrawalModalApp.opportunity?.company_name}</strong>?
            </p>

            <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
              Reason for Withdrawal (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Accepted another offer, scheduling conflict, etc."
              value={withdrawalReason}
              onChange={(e) => setWithdrawalReason(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontFamily: "inherit",
                fontSize: "13px",
                marginBottom: "18px",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setWithdrawalModalApp(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={withdrawing}
                onClick={submitWithdrawal}
                style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
              >
                {withdrawing ? "Withdrawing..." : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
