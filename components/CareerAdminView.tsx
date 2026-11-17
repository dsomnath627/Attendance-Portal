"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import * as XLSX from "xlsx";
import {
  Briefcase,
  Building,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  ExternalLink,
  Edit,
  Trash2,
  Users,
  FileSpreadsheet,
  Award,
  ChevronRight,
  X,
  MessageSquare,
  AlertCircle,
  Eye,
  Calendar,
  Layers,
  MapPin,
} from "lucide-react";
import type { Opportunity, Application } from "./CareerStudentView";

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
  const [activeTab, setActiveTab] = useState<"opportunities" | "ats" | "analytics">("opportunities");
  const [loading, setLoading] = useState(true);

  // Core Data
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  // Filters for Opportunities
  const [oppSearch, setOppSearch] = useState("");
  const [oppStatusFilter, setOppStatusFilter] = useState("all");

  // Filters for ATS
  const [selectedOppFilter, setSelectedOppFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [atsSearch, setAtsSearch] = useState("");

  // Create / Edit Opportunity Modal
  const [oppModalOpen, setOppModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [formOpp, setFormOpp] = useState({
    company_name: "",
    title: "",
    type: "internship" as "internship" | "full_time" | "part_time" | "contract",
    location: "Kolkata, WB",
    workplace_type: "on_site" as "on_site" | "remote" | "hybrid",
    description: "",
    requirements: "",
    salary_range: "",
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    target_departments: [] as string[],
    target_batches: [] as string[],
    min_cgpa: 0,
    min_attendance: 75,
    status: "open" as "open" | "draft" | "closed",
  });
  const [savingOpp, setSavingOpp] = useState(false);

  // ATS Note / Feedback Modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeApplication, setActiveApplication] = useState<any | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    loadAdminData();
  }, [userProfile.id]);

  async function loadAdminData() {
    setLoading(true);
    try {
      // 1. Fetch all opportunities
      const { data: oppsData, error: oppsError } = await supabase
        .from("career_opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (oppsError) {
        console.warn("Could not fetch opportunities:", oppsError.message);
      } else if (oppsData) {
        setOpportunities(oppsData as Opportunity[]);
      }

      // 2. Fetch all applications with candidate & student records
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
          career_opportunities (
            id,
            title,
            company_name,
            type
          ),
          profiles:student_profile_id (
            id,
            full_name,
            email
          ),
          students:student_id (
            id,
            student_id,
            name,
            department_id,
            batch_id
          )
        `)
        .order("applied_at", { ascending: false });

      if (appsError) {
        console.warn("Could not fetch applications:", appsError.message);
      } else if (appsData) {
        setApplications(appsData);
      }
    } catch (err: any) {
      console.error("Error loading career admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Open Create Modal
  function handleOpenCreate() {
    setEditingOpp(null);
    setFormOpp({
      company_name: "",
      title: "",
      type: "internship",
      location: "Kolkata, WB",
      workplace_type: "on_site",
      description: "",
      requirements: "",
      salary_range: "",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      target_departments: [],
      target_batches: [],
      min_cgpa: 0,
      min_attendance: 75,
      status: "open",
    });
    setOppModalOpen(true);
  }

  // Open Edit Modal
  function handleOpenEdit(opp: Opportunity) {
    setEditingOpp(opp);
    setFormOpp({
      company_name: opp.company_name,
      title: opp.title,
      type: opp.type,
      location: opp.location,
      workplace_type: opp.workplace_type,
      description: opp.description,
      requirements: opp.requirements || "",
      salary_range: opp.salary_range || "",
      deadline: opp.deadline ? opp.deadline.slice(0, 10) : "",
      target_departments: opp.target_departments || [],
      target_batches: opp.target_batches || [],
      min_cgpa: opp.min_cgpa || 0,
      min_attendance: opp.min_attendance || 0,
      status: opp.status === "archived" ? "closed" : opp.status,
    });
    setOppModalOpen(true);
  }

  // Save / Update Opportunity
  async function saveOpportunity(e: React.FormEvent) {
    e.preventDefault();
    if (!formOpp.company_name.trim() || !formOpp.title.trim()) {
      showError("Please enter company name and title");
      return;
    }

    setSavingOpp(true);
    try {
      const payload = {
        created_by: userProfile.id,
        company_name: formOpp.company_name.trim(),
        title: formOpp.title.trim(),
        type: formOpp.type,
        location: formOpp.location.trim(),
        workplace_type: formOpp.workplace_type,
        description: formOpp.description.trim(),
        requirements: formOpp.requirements.trim() || null,
        salary_range: formOpp.salary_range.trim() || null,
        deadline: new Date(formOpp.deadline).toISOString(),
        target_departments: formOpp.target_departments,
        target_batches: formOpp.target_batches,
        min_cgpa: Number(formOpp.min_cgpa) || 0,
        min_attendance: Number(formOpp.min_attendance) || 0,
        status: formOpp.status,
        updated_at: new Date().toISOString(),
      };

      if (editingOpp) {
        const { data, error } = await supabase
          .from("career_opportunities")
          .update(payload)
          .eq("id", editingOpp.id)
          .select()
          .single();

        if (error) throw error;
        setOpportunities((prev) =>
          prev.map((o) => (o.id === editingOpp.id ? (data as Opportunity) : o))
        );
        notify("Opportunity updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("career_opportunities")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setOpportunities((prev) => [data as Opportunity, ...prev]);
        notify("New opportunity published successfully!");
      }

      setOppModalOpen(false);
    } catch (err: any) {
      showError(err.message || "Failed to save opportunity");
    } finally {
      setSavingOpp(false);
    }
  }

  // Delete Opportunity
  async function deleteOpportunity(id: string) {
    if (!window.confirm("Are you sure you want to delete this opportunity and its applications?")) return;
    try {
      const { error } = await supabase.from("career_opportunities").delete().eq("id", id);
      if (error) throw error;
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
      setApplications((prev) => prev.filter((a) => a.opportunity_id !== id));
      notify("Opportunity deleted");
    } catch (err: any) {
      showError(err.message || "Failed to delete");
    }
  }

  // Toggle Status Quickly
  async function toggleStatus(opp: Opportunity) {
    const nextStatus = opp.status === "open" ? "closed" : "open";
    try {
      const { error } = await supabase
        .from("career_opportunities")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", opp.id);

      if (error) throw error;
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opp.id ? { ...o, status: nextStatus } : o))
      );
      notify(`Opportunity status changed to ${nextStatus}`);
    } catch (err: any) {
      showError(err.message || "Failed to update status");
    }
  }

  // Update Candidate Status in ATS
  async function updateCandidateStatus(appId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("career_applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) throw error;
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      notify(`Candidate status updated to ${newStatus}`);
    } catch (err: any) {
      showError(err.message || "Failed to update status");
    }
  }

  // Open Feedback Modal
  function handleOpenFeedback(app: any) {
    setActiveApplication(app);
    setFeedbackText(app.feedback || "");
    setFeedbackModalOpen(true);
  }

  // Save Candidate Feedback
  async function saveFeedback() {
    if (!activeApplication) return;
    try {
      const { error } = await supabase
        .from("career_applications")
        .update({
          feedback: feedbackText.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeApplication.id);

      if (error) throw error;
      setApplications((prev) =>
        prev.map((a) =>
          a.id === activeApplication.id ? { ...a, feedback: feedbackText.trim() || null } : a
        )
      );
      notify("Candidate notes/feedback saved!");
      setFeedbackModalOpen(false);
    } catch (err: any) {
      showError(err.message || "Failed to save feedback");
    }
  }

  // Export Filtered Shortlist to Excel (.xlsx)
  function exportAtsToExcel() {
    const rows = filteredApplications.map((app) => {
      const dept = departments.find((d) => d.id === app.students?.department_id);
      const batch = batches.find((b) => b.id === app.students?.batch_id);

      return {
        "Opportunity Title": app.career_opportunities?.title || "N/A",
        "Company Name": app.career_opportunities?.company_name || "N/A",
        "Student Name": app.students?.name || app.profiles?.full_name || "Unknown",
        "Roll Number": app.students?.student_id || "N/A",
        "Email": app.profiles?.email || "N/A",
        "Department": dept?.name || "N/A",
        "Batch": batch?.name || "N/A",
        "Application Status": app.status.toUpperCase(),
        "Applied Date": new Date(app.applied_at).toLocaleDateString(),
        "Resume Link": app.resume_url || "N/A",
        "Recruiter Feedback / Notes": app.feedback || "",
      };
    });

    if (rows.length === 0) {
      showError("No applicant records to export matching current filters");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidate Shortlist");
    const filename = `Candidate_Shortlist_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
    notify(`Candidate shortlist exported: ${filename}`);
  }

  // Filtered Opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(oppSearch.toLowerCase()) ||
      opp.company_name.toLowerCase().includes(oppSearch.toLowerCase()) ||
      opp.location.toLowerCase().includes(oppSearch.toLowerCase());
    const matchesStatus = oppStatusFilter === "all" || opp.status === oppStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered ATS Applications
  const filteredApplications = applications.filter((app) => {
    const matchesOpp =
      selectedOppFilter === "all" || app.opportunity_id === selectedOppFilter;
    const matchesStatus =
      selectedStatusFilter === "all" || app.status === selectedStatusFilter;

    const studentName = app.students?.name || app.profiles?.full_name || "";
    const rollNo = app.students?.student_id || "";
    const email = app.profiles?.email || "";
    const company = app.career_opportunities?.company_name || "";
    const title = app.career_opportunities?.title || "";

    const matchesSearch =
      atsSearch === "" ||
      studentName.toLowerCase().includes(atsSearch.toLowerCase()) ||
      rollNo.toLowerCase().includes(atsSearch.toLowerCase()) ||
      email.toLowerCase().includes(atsSearch.toLowerCase()) ||
      company.toLowerCase().includes(atsSearch.toLowerCase()) ||
      title.toLowerCase().includes(atsSearch.toLowerCase());

    return matchesOpp && matchesStatus && matchesSearch;
  });

  // Analytics Helpers
  const totalOpenOpps = opportunities.filter((o) => o.status === "open").length;
  const totalOffered = applications.filter((a) => a.status === "offered").length;
  const totalInterviewing = applications.filter((a) => a.status === "interview").length;

  return (
    <div className="career-admin-view" style={{ animation: "fadeIn 0.25s ease-in-out" }}>
      {/* ============================================================
          TOP HEADER
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
              Career & Placement Management (T&P Cell)
            </h1>
            <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "14px" }}>
              Publish campus drives, manage recruitment pipelines, review student applicants, and export shortlists
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={activeTab === "opportunities" ? "primary-btn" : "secondary-btn"}
              onClick={() => setActiveTab("opportunities")}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Building size={16} />
              Drives & Postings ({opportunities.length})
            </button>
            <button
              className={activeTab === "ats" ? "primary-btn" : "secondary-btn"}
              onClick={() => setActiveTab("ats")}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Users size={16} />
              Applicant Tracking ({applications.length})
            </button>
            <button
              className={activeTab === "analytics" ? "primary-btn" : "secondary-btn"}
              onClick={() => setActiveTab("analytics")}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Award size={16} />
              Placement Analytics
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          TAB 1: MANAGE DRIVES & POSTINGS
      ============================================================ */}
      {activeTab === "opportunities" && (
        <>
          {/* Top Metric Cards */}
          <div className="metrics-grid" style={{ marginBottom: "20px" }}>
            <div className="metric-card">
              <div className="metric-num">{opportunities.length}</div>
              <div className="metric-label">Total Drives</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">{totalOpenOpps}</div>
              <div className="metric-label">Active & Open</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">{applications.length}</div>
              <div className="metric-label">Total Submissions</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">{totalOffered}</div>
              <div className="metric-label">Offers Extended</div>
            </div>
          </div>

          {/* Action Row */}
          <div className="panel" style={{ padding: "18px 24px", marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", gap: "10px", flex: 1, minWidth: "260px" }}>
                <div style={{ position: "relative", flex: 1 }}>
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
                    placeholder="Search by title, company, or location..."
                    value={oppSearch}
                    onChange={(e) => setOppSearch(e.target.value)}
                    style={{ paddingLeft: "36px" }}
                  />
                </div>

                <select
                  value={oppStatusFilter}
                  onChange={(e) => setOppStatusFilter(e.target.value)}
                  style={{ width: "160px" }}
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <button
                className="primary-btn"
                onClick={handleOpenCreate}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} /> Post New Opportunity
              </button>
            </div>
          </div>

          {/* Postings Table */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Placement & Internship Drives</h2>
                <p>Manage candidate eligibility, deadlines, and publishing status</p>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div className="loading-spinner" />
                <p style={{ marginTop: "12px", color: "#64748b" }}>Loading postings...</p>
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px" }}>
                <Building size={48} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
                <h3 style={{ margin: "0 0 6px", color: "#334155" }}>No Opportunities Found</h3>
                <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "14px" }}>
                  Create a new internship or placement drive to get started.
                </p>
                <button className="primary-btn" onClick={handleOpenCreate}>
                  <Plus size={15} /> Create First Opportunity
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Role & Company</th>
                      <th>Type & Mode</th>
                      <th>Package / Stipend</th>
                      <th>Eligibility Rules</th>
                      <th>Deadline</th>
                      <th>Applicants</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpportunities.map((opp) => {
                      const appCount = applications.filter(
                        (a) => a.opportunity_id === opp.id
                      ).length;
                      const isExpired = new Date(opp.deadline).getTime() < Date.now();

                      return (
                        <tr key={opp.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: "#1e293b" }}>{opp.title}</div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              {opp.company_name} &bull; {opp.location}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "capitalize",
                                background: "#f1f5f9",
                                color: "#475569",
                              }}
                            >
                              {opp.type.replace("_", " ")} &bull; {opp.workplace_type.replace("_", "-")}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: "#047857", fontSize: "13px" }}>
                              {opp.salary_range || "Undisclosed"}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "#64748b" }}>
                            {opp.min_cgpa ? `Min CGPA: ${opp.min_cgpa}` : "No CGPA cutoff"}
                            <br />
                            {opp.min_attendance ? `Min Att: ${opp.min_attendance}%` : "No attendance cutoff"}
                          </td>
                          <td>
                            <div style={{ fontSize: "13px" }}>
                              {new Date(opp.deadline).toLocaleDateString()}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: isExpired ? "#ef4444" : "#16a34a",
                                fontWeight: 600,
                              }}
                            >
                              {isExpired ? "Deadline Closed" : "Active"}
                            </div>
                          </td>
                          <td>
                            <button
                              className="secondary-btn"
                              onClick={() => {
                                setSelectedOppFilter(opp.id);
                                setActiveTab("ats");
                              }}
                              style={{
                                padding: "4px 10px",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Users size={13} />
                              <strong>{appCount}</strong> Candidates
                            </button>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background:
                                  opp.status === "open"
                                    ? "#dcfce7"
                                    : opp.status === "draft"
                                    ? "#fef3c7"
                                    : "#f1f5f9",
                                color:
                                  opp.status === "open"
                                    ? "#15803d"
                                    : opp.status === "draft"
                                    ? "#92400e"
                                    : "#475569",
                              }}
                            >
                              {opp.status}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                className="secondary-btn"
                                onClick={() => toggleStatus(opp)}
                                title={opp.status === "open" ? "Close Drive" : "Open Drive"}
                                style={{ padding: "6px 8px", fontSize: "12px" }}
                              >
                                {opp.status === "open" ? "Close" : "Open"}
                              </button>
                              <button
                                className="secondary-btn"
                                onClick={() => handleOpenEdit(opp)}
                                style={{ padding: "6px 8px" }}
                                title="Edit Opportunity"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                className="danger-btn"
                                onClick={() => deleteOpportunity(opp.id)}
                                style={{ padding: "6px 8px" }}
                                title="Delete Opportunity"
                              >
                                <Trash2 size={14} />
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
        </>
      )}

      {/* ============================================================
          TAB 2: APPLICANT TRACKING SYSTEM (ATS)
      ============================================================ */}
      {activeTab === "ats" && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Applicant Tracking System (ATS)</h2>
              <p>Filter candidates, advance recruitment stages, add notes, and export shortlists</p>
            </div>

            <button
              className="primary-btn"
              onClick={exportAtsToExcel}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#047857",
              }}
            >
              <FileSpreadsheet size={16} /> Export to Excel (.xlsx)
            </button>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(200px, 2fr) minmax(180px, 1.5fr) minmax(140px, 1fr)",
              gap: "12px",
              marginBottom: "20px",
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
                placeholder="Search candidate name, roll no, email, or company..."
                value={atsSearch}
                onChange={(e) => setAtsSearch(e.target.value)}
                style={{ paddingLeft: "36px" }}
              />
            </div>

            <select
              value={selectedOppFilter}
              onChange={(e) => setSelectedOppFilter(e.target.value)}
            >
              <option value="all">All Placement Drives</option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.company_name} - {opp.title}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="all">All Application Stages</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offered">Offered</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {/* ATS Candidates Table */}
          {filteredApplications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <Users size={48} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
              <h3 style={{ margin: "0 0 6px", color: "#334155" }}>No Candidates Found</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                No applications match your selected drive or status filter.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Drive & Role</th>
                    <th>Department & Batch</th>
                    <th>Applied Date</th>
                    <th>Resume</th>
                    <th>Pipeline Stage</th>
                    <th>Notes & Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => {
                    const dept = departments.find((d) => d.id === app.students?.department_id);
                    const batch = batches.find((b) => b.id === app.students?.batch_id);

                    return (
                      <tr key={app.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#1e293b" }}>
                            {app.students?.name || app.profiles?.full_name || "Applicant"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {app.students?.student_id ? `Roll: ${app.students.student_id}` : ""}
                            {app.profiles?.email ? ` &bull; ${app.profiles.email}` : ""}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>
                            {app.career_opportunities?.title || "Role"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {app.career_opportunities?.company_name}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "13px" }}>{dept?.name || "Dept N/A"}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {batch?.name || "Batch N/A"}
                          </div>
                        </td>
                        <td style={{ fontSize: "13px", color: "#64748b" }}>
                          {new Date(app.applied_at).toLocaleDateString()}
                        </td>
                        <td>
                          {app.resume_url ? (
                            <a
                              href={app.resume_url}
                              target="_blank"
                              rel="noreferrer"
                              className="secondary-btn"
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              Resume <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>None</span>
                          )}
                        </td>
                        <td>
                          <select
                            value={app.status}
                            onChange={(e) => updateCandidateStatus(app.id, e.target.value)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              fontWeight: 600,
                              borderRadius: "6px",
                              border: "1px solid #d0d5dd",
                              background:
                                app.status === "offered"
                                  ? "#f0fdf4"
                                  : app.status === "rejected"
                                  ? "#fef2f2"
                                  : app.status === "interview"
                                  ? "#fffbeb"
                                  : "#ffffff",
                              color:
                                app.status === "offered"
                                  ? "#15803d"
                                  : app.status === "rejected"
                                  ? "#b91c1c"
                                  : app.status === "interview"
                                  ? "#b45309"
                                  : "#1e293b",
                            }}
                          >
                            <option value="applied">Applied</option>
                            <option value="screening">Screening</option>
                            <option value="interview">Interview</option>
                            <option value="offered">Offered</option>
                            <option value="rejected">Rejected</option>
                            <option value="withdrawn">Withdrawn</option>
                          </select>
                        </td>
                        <td>
                          <button
                            className="secondary-btn"
                            onClick={() => handleOpenFeedback(app)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <MessageSquare size={13} />
                            {app.feedback ? "Edit Note" : "Add Note"}
                          </button>
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

      {/* ============================================================
          TAB 3: PLACEMENT ANALYTICS & INSIGHTS
      ============================================================ */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* High-level metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-num">{opportunities.length}</div>
              <div className="metric-label">Total Drives Conducted</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">{applications.length}</div>
              <div className="metric-label">Total Applications Handled</div>
            </div>
            <div className="metric-card">
              <div className="metric-num">{totalInterviewing}</div>
              <div className="metric-label">In Active Interviews</div>
            </div>
            <div className="metric-card">
              <div className="metric-num" style={{ color: "#16a34a" }}>
                {totalOffered}
              </div>
              <div className="metric-label">Final Job Offers</div>
            </div>
          </div>

          {/* Breakdown Panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Pipeline Stage Breakdown */}
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Recruitment Funnel</h2>
                  <p>Distribution of candidate stages across all drives</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { label: "Applied", status: "applied", color: "#3b82f6" },
                  { label: "Screening", status: "screening", color: "#8b5cf6" },
                  { label: "Interview", status: "interview", color: "#f59e0b" },
                  { label: "Offered", status: "offered", color: "#10b981" },
                  { label: "Rejected", status: "rejected", color: "#ef4444" },
                ].map((stage) => {
                  const count = applications.filter((a) => a.status === stage.status).length;
                  const pct = applications.length > 0 ? Math.round((count / applications.length) * 100) : 0;

                  return (
                    <div key={stage.status}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{stage.label}</span>
                        <span style={{ color: "#64748b" }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          borderRadius: "4px",
                          background: "#f1f5f9",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: stage.color,
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opportunity Type Breakdown */}
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Drive Types & Engagement</h2>
                  <p>Opportunities partitioned by employment nature</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { label: "Internships", type: "internship", color: "#0284c7" },
                  { label: "Full Time Placements", type: "full_time", color: "#16a34a" },
                  { label: "Part Time / Contracts", type: "contract", color: "#9333ea" },
                ].map((item) => {
                  const count = opportunities.filter((o) => o.type === item.type).length;
                  const appsForType = applications.filter(
                    (a) => a.career_opportunities?.type === item.type
                  ).length;

                  return (
                    <div
                      key={item.type}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {appsForType} candidate applications
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 800,
                          color: item.color,
                        }}
                      >
                        {count} Drives
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          OPPORTUNITY CREATE / EDIT MODAL
      ============================================================ */}
      {oppModalOpen && (
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
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
                {editingOpp ? "Edit Placement Opportunity" : "Publish New Opportunity"}
              </h2>
              <button
                onClick={() => setOppModalOpen(false)}
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

            <form onSubmit={saveOpportunity}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label>Company / Organization Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Google, Microsoft, TCS, Wipro"
                    value={formOpp.company_name}
                    onChange={(e) => setFormOpp({ ...formOpp, company_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label>Job Title / Designation *</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Development Engineer"
                    value={formOpp.title}
                    onChange={(e) => setFormOpp({ ...formOpp, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label>Employment Type</label>
                  <select
                    value={formOpp.type}
                    onChange={(e) => setFormOpp({ ...formOpp, type: e.target.value as any })}
                  >
                    <option value="internship">Internship</option>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>

                <div>
                  <label>Workplace Mode</label>
                  <select
                    value={formOpp.workplace_type}
                    onChange={(e) =>
                      setFormOpp({ ...formOpp, workplace_type: e.target.value as any })
                    }
                  >
                    <option value="on_site">On-site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label>Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Kolkata / Bangalore / Remote"
                    value={formOpp.location}
                    onChange={(e) => setFormOpp({ ...formOpp, location: e.target.value })}
                  />
                </div>

                <div>
                  <label>Salary / Stipend Range</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹25,000/mo or 7-9 LPA"
                    value={formOpp.salary_range}
                    onChange={(e) => setFormOpp({ ...formOpp, salary_range: e.target.value })}
                  />
                </div>

                <div>
                  <label>Application Deadline *</label>
                  <input
                    type="date"
                    value={formOpp.deadline}
                    onChange={(e) => setFormOpp({ ...formOpp, deadline: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label>Publishing Status</label>
                  <select
                    value={formOpp.status}
                    onChange={(e) => setFormOpp({ ...formOpp, status: e.target.value as any })}
                  >
                    <option value="open">Open (Accepting Applications)</option>
                    <option value="draft">Draft (Hidden from Students)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Eligibility criteria */}
                <div>
                  <label>Minimum CGPA Cutoff (0 = None)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formOpp.min_cgpa}
                    onChange={(e) =>
                      setFormOpp({ ...formOpp, min_cgpa: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <label>Minimum Attendance % (0 = None)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formOpp.min_attendance}
                    onChange={(e) =>
                      setFormOpp({ ...formOpp, min_attendance: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                {/* Target Departments */}
                <div style={{ gridColumn: "span 2" }}>
                  <label>Target Departments (Leave empty to allow all departments)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                    {departments.map((dept) => {
                      const isSelected = formOpp.target_departments.includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          className={isSelected ? "primary-btn" : "secondary-btn"}
                          onClick={() => {
                            setFormOpp({
                              ...formOpp,
                              target_departments: isSelected
                                ? formOpp.target_departments.filter((id) => id !== dept.id)
                                : [...formOpp.target_departments, dept.id],
                            });
                          }}
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div style={{ gridColumn: "span 2" }}>
                  <label>Job Description & Responsibilities *</label>
                  <textarea
                    rows={4}
                    placeholder="Enter overview of the role, daily responsibilities, and team culture..."
                    value={formOpp.description}
                    onChange={(e) => setFormOpp({ ...formOpp, description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d0d5dd",
                      fontFamily: "inherit",
                      fontSize: "13px",
                    }}
                    required
                  />
                </div>

                {/* Requirements */}
                <div style={{ gridColumn: "span 2" }}>
                  <label>Key Requirements & Qualifications</label>
                  <textarea
                    rows={3}
                    placeholder="Required skills, languages, tools, or certifications..."
                    value={formOpp.requirements}
                    onChange={(e) => setFormOpp({ ...formOpp, requirements: e.target.value })}
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
              </div>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setOppModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={savingOpp}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <CheckCircle size={15} />
                  {savingOpp ? "Saving..." : editingOpp ? "Save Changes" : "Publish Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          FEEDBACK / INTERVIEW NOTES MODAL
      ============================================================ */}
      {feedbackModalOpen && activeApplication && (
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
              maxWidth: "500px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                Candidate Feedback & Notes
              </h3>
              <button
                onClick={() => setFeedbackModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#64748b" }}>
              Student:{" "}
              <strong>
                {activeApplication.students?.name ||
                  activeApplication.profiles?.full_name ||
                  "Candidate"}
              </strong>{" "}
              &bull; Role: {activeApplication.career_opportunities?.title}
            </p>

            <label>Interview Scheduling / Feedback (Visible to Candidate)</label>
            <textarea
              rows={4}
              placeholder="e.g. Technical Round 1 scheduled for Friday 11 AM IST via Google Meet. Link: https://..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #d0d5dd",
                fontFamily: "inherit",
                fontSize: "13px",
              }}
            />

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setFeedbackModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={saveFeedback}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <CheckCircle size={15} /> Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

