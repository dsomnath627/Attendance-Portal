"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
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
} from "lucide-react";

export type Opportunity = {
  id: string;
  company_name: string;
  company_logo_url?: string | null;
  title: string;
  type: "internship" | "full_time" | "part_time" | "contract";
  location: string;
  workplace_type: "on_site" | "remote" | "hybrid";
  description: string;
  requirements?: string | null;
  salary_range?: string | null;
  deadline: string;
  target_departments?: string[];
  target_batches?: string[];
  min_cgpa?: number;
  min_attendance?: number;
  status: "draft" | "open" | "closed" | "archived";
  created_at: string;
};

export type Application = {
  id: string;
  opportunity_id: string;
  student_profile_id: string;
  student_id?: string | null;
  resume_url: string;
  cover_letter?: string | null;
  status: "applied" | "screening" | "interview" | "offered" | "rejected" | "withdrawn";
  feedback?: string | null;
  applied_at: string;
  opportunity?: Opportunity;
};

export type CareerProfile = {
  id?: string;
  profile_id: string;
  student_id?: string | null;
  phone?: string | null;
  headline?: string | null;
  skills: string[];
  resume_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  bio_summary?: string | null;
  cgpa: number;
  graduation_year?: number | null;
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

  // Data state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [careerProfile, setCareerProfile] = useState<CareerProfile>({
    profile_id: userProfile.id,
    skills: [],
    cgpa: 8.0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterWorkplace, setFilterWorkplace] = useState<string>("all");

  // Application Modal state
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [applyCoverLetter, setApplyCoverLetter] = useState("");
  const [applyResumeUrl, setApplyResumeUrl] = useState("");
  const [applying, setApplying] = useState(false);

  // Skills input helper
  const [skillInput, setSkillInput] = useState("");

  // Resume file upload
  const [uploadingResume, setUploadingResume] = useState(false);

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
          skills: profData.skills || [],
          cgpa: profData.cgpa || 8.0,
        });
        setApplyResumeUrl(profData.resume_url || "");
      }

      // 3. Fetch Open Career Opportunities
      const { data: oppsData, error: oppsError } = await supabase
        .from("career_opportunities")
        .select("*")
        .in("status", ["open", "closed"])
        .order("deadline", { ascending: true });

      if (oppsError) {
        console.warn("Could not load opportunities from database:", oppsError.message);
      } else if (oppsData) {
        setOpportunities(oppsData as Opportunity[]);
      }

      // 4. Fetch Student's Existing Applications
      const { data: appsData, error: appsError } = await supabase
        .from("career_applications")
        .select(`
          id,
          opportunity_id,
          student_profile_id,
          student_id,
          resume_url,
          cover_letter,
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
      }
    } catch (err: any) {
      console.error("Error loading career data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Profile Update
  async function saveCareerProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        profile_id: userProfile.id,
        student_id: studentRecord?.id || null,
        phone: careerProfile.phone || null,
        headline: careerProfile.headline || null,
        skills: careerProfile.skills || [],
        resume_url: careerProfile.resume_url || null,
        linkedin_url: careerProfile.linkedin_url || null,
        github_url: careerProfile.github_url || null,
        portfolio_url: careerProfile.portfolio_url || null,
        bio_summary: careerProfile.bio_summary || null,
        cgpa: careerProfile.cgpa || 8.0,
        graduation_year: careerProfile.graduation_year || 2026,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("student_career_profiles")
        .upsert(payload, { onConflict: "profile_id" });

      if (error) throw error;
      notify("Professional profile updated successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to update profile");
    }
  }

  // Handle Resume File Upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError("Resume file size must be less than 10MB");
      return;
    }

    try {
      setUploadingResume(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${userProfile.id}/${Date.now()}_resume.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { upsert: true });

      if (error) {
        // Fallback if storage bucket is not configured yet
        const localBlob = URL.createObjectURL(file);
        setCareerProfile((prev) => ({ ...prev, resume_url: localBlob }));
        setApplyResumeUrl(localBlob);
        notify("Resume attached (local preview). Update your profile to save.");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      const resumeUrl = publicUrlData?.publicUrl || filePath;
      setCareerProfile((prev) => ({ ...prev, resume_url: resumeUrl }));
      setApplyResumeUrl(resumeUrl);
      notify("Resume uploaded successfully!");
    } catch (err: any) {
      showError(err.message || "Resume upload failed");
    } finally {
      setUploadingResume(false);
    }
  }

  // Add / Remove Skills
  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (careerProfile.skills.includes(trimmed)) {
      setSkillInput("");
      return;
    }
    setCareerProfile((prev) => ({
      ...prev,
      skills: [...prev.skills, trimmed],
    }));
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setCareerProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  }

  // Eligibility Evaluation Engine
  function checkEligibility(opp: Opportunity): {
    eligible: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // 1. Department Check
    if (
      opp.target_departments &&
      opp.target_departments.length > 0 &&
      studentRecord?.department_id
    ) {
      if (!opp.target_departments.includes(studentRecord.department_id)) {
        reasons.push("Not targeted for your department");
      }
    }

    // 2. Batch Check
    if (
      opp.target_batches &&
      opp.target_batches.length > 0 &&
      studentRecord?.batch_id
    ) {
      if (!opp.target_batches.includes(studentRecord.batch_id)) {
        reasons.push("Not targeted for your graduating batch");
      }
    }

    // 3. CGPA Check
    const minCgpa = opp.min_cgpa || 0;
    const studentCgpa = careerProfile.cgpa || 0;
    if (minCgpa > 0 && studentCgpa < minCgpa) {
      reasons.push(`CGPA required: ${minCgpa} (Yours: ${studentCgpa.toFixed(2)})`);
    }

    // 4. Attendance Check
    const minAtt = opp.min_attendance || 0;
    if (minAtt > 0 && attendancePercentage < minAtt) {
      reasons.push(`Attendance required: ${minAtt}% (Yours: ${attendancePercentage}%)`);
    }

    // 5. Expiration / Deadline Check
    const isExpired = new Date(opp.deadline).getTime() < Date.now();
    if (isExpired) {
      reasons.push("Application deadline has passed");
    }

    // 6. Status Check
    if (opp.status !== "open") {
      reasons.push("Posting is currently closed");
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }

  // Check if student has already applied
  function getExistingApplication(oppId: string): Application | undefined {
    return applications.find((a) => a.opportunity_id === oppId);
  }

  // Open Application Modal
  function handleOpenApply(opp: Opportunity) {
    setSelectedOpp(opp);
    setApplyResumeUrl(careerProfile.resume_url || "");
    setApplyCoverLetter("");
    setModalOpen(true);
  }

  // Submit Application
  async function submitApplication() {
    if (!selectedOpp) return;

    if (!applyResumeUrl) {
      showError("Please attach or provide a resume link before applying");
      return;
    }

    setApplying(true);
    try {
      const payload = {
        opportunity_id: selectedOpp.id,
        student_profile_id: userProfile.id,
        student_id: studentRecord?.id || null,
        resume_url: applyResumeUrl,
        cover_letter: applyCoverLetter.trim() || null,
        status: "applied",
        applied_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("career_applications")
        .insert(payload)
        .select("*, career_opportunities(*)")
        .single();

      if (error) throw error;

      notify(`Application for ${selectedOpp.title} at ${selectedOpp.company_name} submitted!`);
      setApplications((prev) => [
        { ...data, opportunity: data.career_opportunities },
        ...prev,
      ]);
      setModalOpen(false);
    } catch (err: any) {
      showError(err.message || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  }

  // Withdraw Application
  async function withdrawApplication(appId: string) {
    if (!window.confirm("Are you sure you want to withdraw this application?")) return;
    try {
      const { error } = await supabase
        .from("career_applications")
        .update({ status: "withdrawn", updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) throw error;
      notify("Application withdrawn");
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "withdrawn" } : a))
      );
    } catch (err: any) {
      showError(err.message || "Failed to withdraw");
    }
  }

  // Filtered Opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || opp.type === filterType;
    const matchesWorkplace =
      filterWorkplace === "all" || opp.workplace_type === filterWorkplace;

    return matchesSearch && matchesType && matchesWorkplace;
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
              Explore campus drives, verified internships, and full-time placement opportunities
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
                Academic Attendance: <strong>{attendancePercentage}%</strong> &bull; CGPA:{" "}
                <strong>{careerProfile.cgpa ? careerProfile.cgpa.toFixed(2) : "N/A"}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
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
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                background: careerProfile.resume_url ? "#e0f2fe" : "#fef3c7",
                color: careerProfile.resume_url ? "#0369a1" : "#92400e",
              }}
            >
              {careerProfile.resume_url ? "✓ Resume Ready" : "⚠ Resume Missing"}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          TAB 1: OPPORTUNITIES (BROWSE & APPLY)
      ============================================================ */}
      {activeTab === "opportunities" && (
        <>
          {/* Quick Stats Grid */}
          <div className="metrics-grid" style={{ marginBottom: "20px" }}>
            <div className="metric-card">
              <div className="metric-num">{opportunities.length}</div>
              <div className="metric-label">Active Drives</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">
                {opportunities.filter((o) => checkEligibility(o).eligible).length}
              </div>
              <div className="metric-label">Eligible For You</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">{activeAppsCount}</div>
              <div className="metric-label">In Review</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">
                {applications.filter((a) => a.status === "offered").length}
              </div>
              <div className="metric-label">Offers Received</div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="panel" style={{ padding: "18px 24px", marginBottom: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr)",
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
                  placeholder="Search by role, company, or location..."
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
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </select>

              <select
                value={filterWorkplace}
                onChange={(e) => setFilterWorkplace(e.target.value)}
              >
                <option value="all">All Workplace Modes</option>
                <option value="on_site">On-site</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Opportunities Cards Grid */}
          {loading ? (
            <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
              <div className="loading-spinner" />
              <p style={{ marginTop: "12px", color: "#64748b" }}>Loading active opportunities...</p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="panel" style={{ textAlign: "center", padding: "50px 20px" }}>
              <Building size={48} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
              <h3 style={{ margin: "0 0 6px", color: "#334155" }}>No Opportunities Found</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                There are currently no active placement drives matching your criteria. Check back soon!
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: "18px",
              }}
            >
              {filteredOpportunities.map((opp) => {
                const eligibility = checkEligibility(opp);
                const existingApp = getExistingApplication(opp.id);
                const deadlineDate = new Date(opp.deadline);
                const daysRemaining = Math.ceil(
                  (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

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
                        : eligibility.eligible
                        ? "1px solid #e2e8f0"
                        : "1px solid #fecaca",
                      position: "relative",
                      margin: 0,
                    }}
                  >
                    <div>
                      {/* Company Header */}
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
                          marginBottom: "14px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={14} />
                          <span>
                            {opp.location} ({opp.workplace_type.replace("_", "-")})
                          </span>
                        </div>
                        {opp.salary_range && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#047857", fontWeight: 600 }}>
                            <DollarSign size={14} />
                            <span>{opp.salary_range}</span>
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

                      {/* Brief Description */}
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#475569",
                          lineHeight: "1.5",
                          margin: "0 0 14px",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {opp.description}
                      </p>

                      {/* Eligibility Banner on Card */}
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "14px",
                          background: existingApp
                            ? "#eff6ff"
                            : eligibility.eligible
                            ? "#f0fdf4"
                            : "#fef2f2",
                          color: existingApp
                            ? "#1e40af"
                            : eligibility.eligible
                            ? "#166534"
                            : "#991b1b",
                          border: `1px solid ${
                            existingApp
                              ? "#bfdbfe"
                              : eligibility.eligible
                              ? "#bbf7d0"
                              : "#fecaca"
                          }`,
                        }}
                      >
                        {existingApp ? (
                          <>
                            <CheckCircle size={15} />
                            <span>
                              Applied &bull; Status:{" "}
                              <strong style={{ textTransform: "capitalize" }}>
                                {existingApp.status}
                              </strong>
                            </span>
                          </>
                        ) : eligibility.eligible ? (
                          <>
                            <CheckCircle size={15} />
                            <span>Eligible &bull; Meets department, CGPA & attendance criteria</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={15} />
                            <span>{eligibility.reasons[0] || "Ineligible for this drive"}</span>
                          </>
                        )}
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
                        View Details
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
                          disabled={!eligibility.eligible}
                          onClick={() => handleOpenApply(opp)}
                          style={{
                            padding: "8px 18px",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Send size={14} />
                          Apply Now
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
          TAB 2: MY APPLICATIONS
      ============================================================ */}
      {activeTab === "applications" && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>My Recruitment Pipeline</h2>
              <p>Track your applications, interview invites, and recruiter decisions in real time</p>
            </div>
          </div>

          {applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <FileText size={48} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
              <h3 style={{ margin: "0 0 6px", color: "#334155" }}>No Applications Submitted Yet</h3>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "14px" }}>
                Browse opportunities and submit your profile to begin tracking your recruitment progress.
              </p>
              <button
                className="primary-btn"
                onClick={() => setActiveTab("opportunities")}
              >
                Browse Active Opportunities
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {applications.map((app) => {
                const opp = app.opportunity;
                const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                  applied: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
                  screening: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
                  interview: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
                  offered: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
                  rejected: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
                  withdrawn: { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" },
                };
                const config = statusColors[app.status] || statusColors.applied;

                return (
                  <div
                    key={app.id}
                    style={{
                      border: `1px solid ${config.border}`,
                      borderRadius: "14px",
                      padding: "20px",
                      background: "#ffffff",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginBottom: "14px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
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
                        </div>
                        <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
                          {opp?.company_name} &bull; Applied on{" "}
                          {new Date(app.applied_at).toLocaleDateString()}
                        </div>
                      </div>

                      {app.status === "applied" && (
                        <button
                          className="secondary-btn"
                          onClick={() => withdrawApplication(app.id)}
                          style={{ fontSize: "12px", padding: "6px 12px", color: "#ef4444" }}
                        >
                          Withdraw
                        </button>
                      )}
                    </div>

                    {/* Progress Pipeline Stepper */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "8px",
                        margin: "16px 0",
                        padding: "12px 14px",
                        background: "#f8fafc",
                        borderRadius: "10px",
                      }}
                    >
                      {[
                        { label: "Applied", step: "applied" },
                        { label: "Screening", step: "screening" },
                        { label: "Interview", step: "interview" },
                        { label: "Decision", step: "offered" },
                      ].map((s, idx) => {
                        const stepOrder = ["applied", "screening", "interview", "offered"];
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
                                width: "24px",
                                height: "24px",
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
                          marginTop: "10px",
                        }}
                      >
                        <strong>Recruiter / Coordinator Note:</strong> {app.feedback}
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
                      <span style={{ color: "#64748b" }}>Submitted Resume:</span>
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
                        View Attachment <ExternalLink size={13} />
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
          TAB 3: CAREER PROFILE EDITOR
      ============================================================ */}
      {activeTab === "profile" && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Professional Placement Profile</h2>
              <p>Keep your skills, resume, and credentials updated for university campus drives</p>
            </div>
          </div>

          <form onSubmit={saveCareerProfile}>
            <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              {/* Professional Headline */}
              <div style={{ gridColumn: "span 2" }}>
                <label>Professional Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack Developer | Final Year B.Tech CSE | React & Python"
                  value={careerProfile.headline || ""}
                  onChange={(e) =>
                    setCareerProfile({ ...careerProfile, headline: e.target.value })
                  }
                />
              </div>

              {/* Phone Number */}
              <div>
                <label>Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={careerProfile.phone || ""}
                  onChange={(e) =>
                    setCareerProfile({ ...careerProfile, phone: e.target.value })
                  }
                />
              </div>

              {/* CGPA */}
              <div>
                <label>Current CGPA (Out of 10.0)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={careerProfile.cgpa || 8.0}
                  onChange={(e) =>
                    setCareerProfile({
                      ...careerProfile,
                      cgpa: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              {/* Expected Graduation Year */}
              <div>
                <label>Expected Graduation Year</label>
                <input
                  type="number"
                  placeholder="2026"
                  value={careerProfile.graduation_year || 2026}
                  onChange={(e) =>
                    setCareerProfile({
                      ...careerProfile,
                      graduation_year: parseInt(e.target.value) || 2026,
                    })
                  }
                />
              </div>

              {/* LinkedIn URL */}
              <div>
                <label>LinkedIn Profile URL</label>
                <div style={{ position: "relative" }}>
                  <Linkedin
                    size={16}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#0a66c2",
                    }}
                  />
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={careerProfile.linkedin_url || ""}
                    onChange={(e) =>
                      setCareerProfile({ ...careerProfile, linkedin_url: e.target.value })
                    }
                    style={{ paddingLeft: "36px" }}
                  />
                </div>
              </div>

              {/* GitHub URL */}
              <div>
                <label>GitHub Profile URL</label>
                <div style={{ position: "relative" }}>
                  <Github
                    size={16}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#333",
                    }}
                  />
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={careerProfile.github_url || ""}
                    onChange={(e) =>
                      setCareerProfile({ ...careerProfile, github_url: e.target.value })
                    }
                    style={{ paddingLeft: "36px" }}
                  />
                </div>
              </div>

              {/* Portfolio URL */}
              <div>
                <label>Portfolio / Personal Website</label>
                <div style={{ position: "relative" }}>
                  <Globe
                    size={16}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748b",
                    }}
                  />
                  <input
                    type="url"
                    placeholder="https://yourportfolio.dev"
                    value={careerProfile.portfolio_url || ""}
                    onChange={(e) =>
                      setCareerProfile({ ...careerProfile, portfolio_url: e.target.value })
                    }
                    style={{ paddingLeft: "36px" }}
                  />
                </div>
              </div>

              {/* Skills Tag Input */}
              <div style={{ gridColumn: "span 2" }}>
                <label>Technical & Core Skills</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    placeholder="Add a skill (e.g. React, Next.js, Java, SQL, Machine Learning)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={addSkill}
                    style={{ display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {careerProfile.skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        padding: "5px 12px",
                        background: "#f1f5f9",
                        borderRadius: "20px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#334155",
                        fontWeight: 600,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {skill}
                      <X
                        size={14}
                        style={{ cursor: "pointer", color: "#94a3b8" }}
                        onClick={() => removeSkill(skill)}
                      />
                    </span>
                  ))}
                  {careerProfile.skills.length === 0 && (
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                      No skills added yet. Add relevant technical and domain skills above.
                    </span>
                  )}
                </div>
              </div>

              {/* Resume File Upload or Link */}
              <div style={{ gridColumn: "span 2" }}>
                <label>Resume (PDF / DOCX)</label>
                <div
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: "12px",
                    padding: "20px",
                    textAlign: "center",
                    background: "#f8fafc",
                    marginBottom: "10px",
                  }}
                >
                  <FileText size={36} color="#64748b" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>
                    {careerProfile.resume_url ? "Resume Attached" : "Upload Your Latest Resume"}
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 12px" }}>
                    Supported formats: PDF, DOC, DOCX up to 10MB
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                    <label
                      htmlFor="resume-upload"
                      className="primary-btn"
                      style={{
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                      }}
                    >
                      {uploadingResume ? "Uploading..." : "Choose File"}
                    </label>
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                      disabled={uploadingResume}
                    />

                    {careerProfile.resume_url && (
                      <a
                        href={careerProfile.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="secondary-btn"
                        style={{
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                        }}
                      >
                        Preview Resume <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Direct Link fallback */}
                <input
                  type="url"
                  placeholder="Or paste external Google Drive / cloud resume link..."
                  value={careerProfile.resume_url || ""}
                  onChange={(e) =>
                    setCareerProfile({ ...careerProfile, resume_url: e.target.value })
                  }
                />
              </div>

              {/* Bio Summary */}
              <div style={{ gridColumn: "span 2" }}>
                <label>Executive Bio / Career Objective</label>
                <textarea
                  rows={4}
                  placeholder="Share a brief overview of your projects, achievements, and career interests..."
                  value={careerProfile.bio_summary || ""}
                  onChange={(e) =>
                    setCareerProfile({ ...careerProfile, bio_summary: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid #d0d5dd",
                    fontFamily: "inherit",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="primary-btn"
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px" }}
              >
                <CheckCircle size={16} /> Save Career Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          APPLICATION MODAL (DETAILS & SUBMIT)
      ============================================================ */}
      {modalOpen && selectedOpp && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
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
              maxWidth: "640px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
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
              {selectedOpp.salary_range && (
                <div>
                  <strong>Package:</strong> {selectedOpp.salary_range}
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
              {selectedOpp.min_attendance ? (
                <div>
                  <strong>Min Attendance:</strong> {selectedOpp.min_attendance}%
                </div>
              ) : null}
            </div>

            {/* Job Description */}
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

            {/* Job Requirements */}
            {selectedOpp.requirements && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700 }}>
                  Key Requirements
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
                  {selectedOpp.requirements}
                </p>
              </div>
            )}

            <hr style={{ border: "0", borderTop: "1px solid #f1f5f9", margin: "20px 0" }} />

            {/* Application Form */}
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700 }}>
                Submit Your Application
              </h4>

              {/* Resume link verification */}
              <div style={{ marginBottom: "14px" }}>
                <label>Resume URL to submit *</label>
                <input
                  type="url"
                  placeholder="https://... your resume link"
                  value={applyResumeUrl}
                  onChange={(e) => setApplyResumeUrl(e.target.value)}
                  required
                />
                {!applyResumeUrl && (
                  <p style={{ margin: "4px 0 0", color: "#e11d48", fontSize: "12px" }}>
                    Please provide your resume URL or upload one in your Career Profile.
                  </p>
                )}
              </div>

              {/* Cover note */}
              <div style={{ marginBottom: "20px" }}>
                <label>Optional Note to Recruiter / Cover Letter</label>
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
                  disabled={applying || !applyResumeUrl}
                  onClick={submitApplication}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Send size={15} />
                  {applying ? "Submitting..." : "Confirm & Submit Application"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

