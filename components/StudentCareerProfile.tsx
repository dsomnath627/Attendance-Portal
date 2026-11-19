"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import {
  User, GraduationCap, Briefcase, Award, FileText, Link as LinkIcon,
  Github, Linkedin, Globe, Plus, X, Edit, Trash2, ExternalLink,
  CheckCircle, Lock, Upload, Star, Code, BookOpen, Camera,
  ChevronDown, ChevronUp, Save, AlertTriangle, Building2,
  Calendar, Hash, Layers, Zap,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */
type StudentRecord = {
  id: string;
  student_id: string;
  name: string;
  department_id: string;
  batch_id: string;
  department_name?: string;
  batch_name?: string;
  group_name?: string;
};

type SgpaRecord = {
  id: string;
  semester_no: number;
  semester_name?: string;
  sgpa: number;
  cgpa?: number;
  backlogs?: number;
};

type Project = {
  id: string;
  title: string;
  description?: string;
  technologies: string[];
  repo_url?: string;
  demo_url?: string;
  start_date?: string;
  end_date?: string;
  is_featured: boolean;
  sort_order: number;
};

type Experience = {
  id: string;
  company: string;
  role: string;
  type: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  skills_used: string[];
};

type Certification = {
  id: string;
  title: string;
  issuing_org?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
  type: string;
};

type CvVersion = {
  id: string;
  label: string;
  file_url: string;
  file_name?: string;
  is_primary: boolean;
  uploaded_at: string;
};

type CareerProfileData = {
  id?: string;
  avatar_url?: string;
  introduction?: string;
  phone?: string;
  headline?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  technical_skills: string[];
  soft_skills: string[];
  marks_10th?: number;
  marks_12th?: number;
  marks_10th_verified?: boolean;
  marks_12th_verified?: boolean;
  active_backlogs?: number;
  total_backlogs?: number;
  backlogs_verified?: boolean;
  cgpa?: number;
  graduation_year?: number;
  bio_summary?: string;
};

/* ============================================================
   HELPER COMPONENTS
============================================================ */

function SectionCard({
  icon, title, subtitle, locked, children, action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  locked?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      overflow: "hidden",
      marginBottom: "20px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        padding: "16px 22px",
        background: locked ? "#f8fafc" : "#fafafa",
        borderBottom: "1px solid #f1f5f9",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "9px",
            background: locked ? "#e2e8f0" : "var(--theme-primary,#111827)",
            color: locked ? "#94a3b8" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", display: "flex", alignItems: "center", gap: "7px" }}>
              {title}
              {locked && (
                <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "10px", background: "#fef3c7", color: "#92400e", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
                  <Lock size={10} /> Official Record
                </span>
              )}
            </div>
            {subtitle && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>{subtitle}</div>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div style={{ padding: "20px 22px" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
      {icon && <div style={{ color: "#94a3b8", marginTop: "2px", flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: value ? "#0f172a" : "#94a3b8", marginTop: "1px" }}>
          {value ?? "—"}
        </div>
      </div>
    </div>
  );
}

function TagChip({ label, color = "#1e293b", bg = "#f1f5f9", onRemove }: {
  label: string; color?: string; bg?: string; onRemove?: () => void;
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "4px 11px", borderRadius: "20px", fontSize: "12px",
      fontWeight: 600, color, background: bg, border: `1px solid ${color}18`,
    }}>
      {label}
      {onRemove && <X size={12} style={{ cursor: "pointer", opacity: 0.6 }} onClick={onRemove} />}
    </span>
  );
}

function TagInput({ tags, onChange, placeholder, color, bg }: {
  tags: string[]; onChange: (t: string[]) => void;
  placeholder: string; color?: string; bg?: string;
}) {
  const [val, setVal] = useState("");
  function add() {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal("");
  }
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input type="text" value={val} placeholder={placeholder}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          style={{ flex: 1 }} />
        <button type="button" className="secondary-btn" onClick={add} style={{ whiteSpace: "nowrap" }}>+ Add</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {tags.map((t) => <TagChip key={t} label={t} color={color} bg={bg} onRemove={() => onChange(tags.filter((x) => x !== t))} />)}
        {tags.length === 0 && <span style={{ fontSize: "12px", color: "#94a3b8" }}>None added yet</span>}
      </div>
    </div>
  );
}

function ProfileCompleteness({ score }: { score: number }) {
  const color = score < 40 ? "#ef4444" : score < 70 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ marginBottom: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}>
        <span style={{ color: "#64748b" }}>Profile Completeness</span>
        <span style={{ color }}>{score}%</span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

/* ============================================================
   MODALS
============================================================ */

function ProjectModal({ initial, onSave, onClose }: {
  initial?: Partial<Project>;
  onSave: (p: Omit<Project, "id" | "sort_order">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    technologies: initial?.technologies ?? [],
    repo_url: initial?.repo_url ?? "",
    demo_url: initial?.demo_url ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    is_featured: initial?.is_featured ?? false,
  });
  return (
    <ModalShell title={initial?.id ? "Edit Project" : "Add Project"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div><label>Project Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
        <div><label>Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontFamily: "inherit", fontSize: "13px" }} />
        </div>
        <div>
          <label>Technologies Used</label>
          <TagInput tags={form.technologies} onChange={(t) => setForm({ ...form, technologies: t })}
            placeholder="React, Node.js, Python…" color="#1e293b" bg="#f1f5f9" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div><label>Start Date</label><input type="month" value={form.start_date?.slice(0, 7)} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><label>End Date (blank = Ongoing)</label><input type="month" value={form.end_date?.slice(0, 7)} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          <div><label>GitHub / Repo URL</label><input type="url" value={form.repo_url} onChange={(e) => setForm({ ...form, repo_url: e.target.value })} placeholder="https://github.com/…" /></div>
          <div><label>Live Demo URL</label><input type="url" value={form.demo_url} onChange={(e) => setForm({ ...form, demo_url: e.target.value })} placeholder="https://…" /></div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} style={{ width: "auto" }} />
          Mark as Featured Project
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-btn" onClick={() => { if (form.title.trim()) onSave(form); }}>Save Project</button>
        </div>
      </div>
    </ModalShell>
  );
}

function ExperienceModal({ initial, onSave, onClose }: {
  initial?: Partial<Experience>;
  onSave: (e: Omit<Experience, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    company: initial?.company ?? "",
    role: initial?.role ?? "",
    type: initial?.type ?? "internship",
    location: initial?.location ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    description: initial?.description ?? "",
    skills_used: initial?.skills_used ?? [],
  });
  return (
    <ModalShell title={initial?.id ? "Edit Experience" : "Add Experience"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div><label>Company / Organisation *</label><input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><label>Role / Designation *</label><input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {["internship","part_time","full_time","freelance","research","volunteer"].map((t) => (
                <option key={t} value={t}>{t.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div><label>Location</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Bangalore / Remote" /></div>
          <div><label>Start Date</label><input type="month" value={form.start_date?.slice(0,7)} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><label>End Date (blank = Current)</label><input type="month" value={form.end_date?.slice(0,7)} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
        </div>
        <div><label>Description & Key Responsibilities</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontFamily: "inherit", fontSize: "13px" }} />
        </div>
        <div>
          <label>Skills Used</label>
          <TagInput tags={form.skills_used} onChange={(t) => setForm({ ...form, skills_used: t })}
            placeholder="Python, Tableau, REST APIs…" color="#1e40af" bg="#dbeafe" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-btn" onClick={() => { if (form.company && form.role) onSave(form); }}>Save</button>
        </div>
      </div>
    </ModalShell>
  );
}

function CertModal({ initial, onSave, onClose }: {
  initial?: Partial<Certification>;
  onSave: (c: Omit<Certification, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    issuing_org: initial?.issuing_org ?? "",
    issue_date: initial?.issue_date ?? "",
    expiry_date: initial?.expiry_date ?? "",
    credential_id: initial?.credential_id ?? "",
    credential_url: initial?.credential_url ?? "",
    type: initial?.type ?? "certification",
  });
  return (
    <ModalShell title={initial?.id ? "Edit Certification" : "Add Certification / Achievement"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div><label>Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AWS Certified Solutions Architect" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div><label>Issuing Organisation</label><input type="text" value={form.issuing_org} onChange={(e) => setForm({ ...form, issuing_org: e.target.value })} /></div>
          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {["certification","achievement","award","publication","patent","other"].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div><label>Issue Date</label><input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
          <div><label>Expiry Date (blank = No Expiry)</label><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
          <div><label>Credential ID</label><input type="text" value={form.credential_id} onChange={(e) => setForm({ ...form, credential_id: e.target.value })} /></div>
          <div><label>Credential / Verify URL</label><input type="url" value={form.credential_url} onChange={(e) => setForm({ ...form, credential_url: e.target.value })} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-btn" onClick={() => { if (form.title) onSave(form); }}>Save</button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 2000, padding: "20px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: "18px", width: "100%", maxWidth: "580px", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", marginTop: "30px", marginBottom: "30px" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "22px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
interface StudentCareerProfileProps {
  userProfile: UserProfile;
  notify: (msg: string) => void;
  showError: (msg: string) => void;
}

export default function StudentCareerProfile({ userProfile, notify, showError }: StudentCareerProfileProps) {
  /* ── state ── */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [sgpaRecords, setSgpaRecords] = useState<SgpaRecord[]>([]);

  const [profile, setProfile] = useState<CareerProfileData>({
    technical_skills: [], soft_skills: [],
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [cvVersions, setCvVersions] = useState<CvVersion[]>([]);

  /* modals */
  const [projModal, setProjModal] = useState<{ open: boolean; editing?: Project }>({ open: false });
  const [expModal, setExpModal] = useState<{ open: boolean; editing?: Experience }>({ open: false });
  const [certModal, setCertModal] = useState<{ open: boolean; editing?: Certification }>({ open: false });

  /* cv upload */
  const [uploadingCv, setUploadingCv] = useState(false);
  const [newCvLabel, setNewCvLabel] = useState("General CV");
  const cvInputRef = useRef<HTMLInputElement>(null);

  /* avatar upload */
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  /* active section scroll */
  const [activeSection, setActiveSection] = useState("overview");

  /* ── load ── */
  useEffect(() => { loadAll(); }, [userProfile.id]);

  async function loadAll() {
    setLoading(true);
    try {
      // 1. Institutional student record + department/batch names
      const { data: sr } = await supabase
        .from("students")
        .select("id, student_id, name, department_id, batch_id, departments(name), batches(name)")
        .eq("profile_id", userProfile.id)
        .maybeSingle();
      if (sr) {
        setStudent({
          id: sr.id, student_id: sr.student_id, name: sr.name,
          department_id: sr.department_id, batch_id: sr.batch_id,
          department_name: (sr as any).departments?.name,
          batch_name: (sr as any).batches?.name,
        });

        // 2. SGPA records
        const { data: sgpa } = await supabase
          .from("student_sgpa_records")
          .select("*")
          .eq("student_id", sr.id)
          .order("semester_no", { ascending: true });
        if (sgpa) setSgpaRecords(sgpa);
      }

      // 3. Career profile
      const { data: cp } = await supabase
        .from("student_career_profiles")
        .select("*")
        .eq("profile_id", userProfile.id)
        .maybeSingle();
      if (cp) {
        setProfile({
          ...cp,
          technical_skills: cp.technical_skills ?? cp.skills ?? [],
          soft_skills: cp.soft_skills ?? [],
        });
      }

      // 4. Projects
      const { data: proj } = await supabase.from("career_projects").select("*").eq("profile_id", userProfile.id).order("sort_order");
      if (proj) setProjects(proj);

      // 5. Experiences
      const { data: exp } = await supabase.from("career_experiences").select("*").eq("profile_id", userProfile.id).order("start_date", { ascending: false });
      if (exp) setExperiences(exp);

      // 6. Certifications
      const { data: cert } = await supabase.from("career_certifications").select("*").eq("profile_id", userProfile.id).order("issue_date", { ascending: false });
      if (cert) setCertifications(cert);

      // 7. CV versions
      const { data: cvs } = await supabase.from("career_cv_versions").select("*").eq("profile_id", userProfile.id).order("uploaded_at", { ascending: false });
      if (cvs) setCvVersions(cvs);

    } catch (err: any) {
      console.error("loadAll error:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ── save career profile ── */
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        profile_id: userProfile.id,
        student_id: student?.id ?? null,
        avatar_url: profile.avatar_url ?? null,
        introduction: profile.introduction ?? null,
        phone: profile.phone ?? null,
        headline: profile.headline ?? null,
        linkedin_url: profile.linkedin_url ?? null,
        github_url: profile.github_url ?? null,
        portfolio_url: profile.portfolio_url ?? null,
        bio_summary: profile.bio_summary ?? null,
        technical_skills: profile.technical_skills,
        soft_skills: profile.soft_skills,
        skills: profile.technical_skills, // backward compat
        marks_10th: profile.marks_10th ?? null,
        marks_12th: profile.marks_12th ?? null,
        active_backlogs: profile.active_backlogs ?? 0,
        total_backlogs: profile.total_backlogs ?? 0,
        cgpa: profile.cgpa ?? null,
        graduation_year: profile.graduation_year ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("student_career_profiles").upsert(payload, { onConflict: "profile_id" });
      if (error) throw error;
      notify("Career profile saved!");
    } catch (err: any) {
      showError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  /* ── avatar upload ── */
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const path = `${userProfile.id}/avatar_${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setProfile((p) => ({ ...p, avatar_url: pub.publicUrl }));
      notify("Photo updated!");
    } catch (err: any) {
      // fallback: show local preview
      const url = URL.createObjectURL(file);
      setProfile((p) => ({ ...p, avatar_url: url }));
      notify("Photo preview set (save profile to persist)");
    } finally {
      setUploadingAvatar(false);
    }
  }

  /* ── CV upload ── */
  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showError("File must be under 10MB"); return; }
    setUploadingCv(true);
    try {
      const path = `${userProfile.id}/cv_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: false });
      let fileUrl = path;
      if (!upErr) {
        const { data: pub } = supabase.storage.from("resumes").getPublicUrl(path);
        fileUrl = pub.publicUrl;
      }
      const { data, error } = await supabase.from("career_cv_versions").insert({
        profile_id: userProfile.id,
        label: newCvLabel.trim() || "My CV",
        file_url: fileUrl,
        file_name: file.name,
        is_primary: cvVersions.length === 0, // first CV becomes primary
      }).select().single();
      if (error) throw error;
      setCvVersions((prev) => [data as CvVersion, ...prev]);
      setNewCvLabel("General CV");
      if (cvInputRef.current) cvInputRef.current.value = "";
      notify("CV uploaded!");
    } catch (err: any) {
      showError(err.message || "Upload failed");
    } finally {
      setUploadingCv(false);
    }
  }

  async function setPrimaryCv(id: string) {
    // unset all, set chosen
    await supabase.from("career_cv_versions").update({ is_primary: false }).eq("profile_id", userProfile.id);
    await supabase.from("career_cv_versions").update({ is_primary: true }).eq("id", id);
    setCvVersions((prev) => prev.map((c) => ({ ...c, is_primary: c.id === id })));
    notify("Primary CV updated");
  }

  async function deleteCv(id: string) {
    if (!window.confirm("Delete this CV version?")) return;
    await supabase.from("career_cv_versions").delete().eq("id", id);
    setCvVersions((prev) => prev.filter((c) => c.id !== id));
    notify("CV removed");
  }

  /* ── projects ── */
  async function saveProject(data: Omit<Project, "id" | "sort_order">, existingId?: string) {
    const payload = { ...data, profile_id: userProfile.id, sort_order: projects.length, updated_at: new Date().toISOString() };
    if (existingId) {
      const { error } = await supabase.from("career_projects").update(payload).eq("id", existingId);
      if (error) { showError(error.message); return; }
      setProjects((p) => p.map((x) => (x.id === existingId ? { ...x, ...data } : x)));
    } else {
      const { data: row, error } = await supabase.from("career_projects").insert(payload).select().single();
      if (error) { showError(error.message); return; }
      setProjects((p) => [...p, row as Project]);
    }
    setProjModal({ open: false });
    notify("Project saved");
  }

  async function deleteProject(id: string) {
    await supabase.from("career_projects").delete().eq("id", id);
    setProjects((p) => p.filter((x) => x.id !== id));
    notify("Project removed");
  }

  /* ── experiences ── */
  async function saveExperience(data: Omit<Experience, "id">, existingId?: string) {
    const payload = { ...data, profile_id: userProfile.id, updated_at: new Date().toISOString() };
    if (existingId) {
      const { error } = await supabase.from("career_experiences").update(payload).eq("id", existingId);
      if (error) { showError(error.message); return; }
      setExperiences((p) => p.map((x) => (x.id === existingId ? { ...x, ...data } : x)));
    } else {
      const { data: row, error } = await supabase.from("career_experiences").insert(payload).select().single();
      if (error) { showError(error.message); return; }
      setExperiences((p) => [row as Experience, ...p]);
    }
    setExpModal({ open: false });
    notify("Experience saved");
  }

  async function deleteExperience(id: string) {
    await supabase.from("career_experiences").delete().eq("id", id);
    setExperiences((p) => p.filter((x) => x.id !== id));
    notify("Experience removed");
  }

  /* ── certifications ── */
  async function saveCert(data: Omit<Certification, "id">, existingId?: string) {
    const payload = { ...data, profile_id: userProfile.id };
    if (existingId) {
      const { error } = await supabase.from("career_certifications").update(payload).eq("id", existingId);
      if (error) { showError(error.message); return; }
      setCertifications((p) => p.map((x) => (x.id === existingId ? { ...x, ...data } : x)));
    } else {
      const { data: row, error } = await supabase.from("career_certifications").insert(payload).select().single();
      if (error) { showError(error.message); return; }
      setCertifications((p) => [row as Certification, ...p]);
    }
    setCertModal({ open: false });
    notify("Certification saved");
  }

  async function deleteCert(id: string) {
    await supabase.from("career_certifications").delete().eq("id", id);
    setCertifications((p) => p.filter((x) => x.id !== id));
    notify("Certification removed");
  }

  /* ── completeness score ── */
  const completeness = Math.round(
    ([
      !!profile.avatar_url,
      !!profile.headline,
      !!profile.introduction,
      !!profile.phone,
      !!profile.linkedin_url,
      !!profile.github_url,
      profile.technical_skills.length > 0,
      profile.soft_skills.length > 0,
      projects.length > 0,
      experiences.length > 0,
      certifications.length > 0,
      cvVersions.length > 0,
      !!profile.marks_10th,
      !!profile.marks_12th,
    ].filter(Boolean).length / 14) * 100
  );

  if (loading) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div className="loading-spinner" />
      <p style={{ marginTop: "14px", color: "#64748b" }}>Loading your career profile…</p>
    </div>
  );

  /* ── CGPA from SGPA records ── */
  const latestSgpa = sgpaRecords.length > 0 ? sgpaRecords[sgpaRecords.length - 1] : null;
  const computedCgpa = latestSgpa?.cgpa ?? profile.cgpa;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ animation: "fadeIn 0.2s ease" }}>

      {/* ── PROFILE HERO HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg, var(--theme-primary,#111827) 0%, #1e3a5f 100%)",
        borderRadius: "20px",
        padding: "32px",
        marginBottom: "24px",
        color: "#fff",
        display: "flex",
        gap: "28px",
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: "100px", height: "100px", borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.3)",
            overflow: "hidden", background: "rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <User size={42} color="rgba(255,255,255,0.5)" />
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              position: "absolute", bottom: 2, right: 2, width: "28px", height: "28px",
              borderRadius: "50%", border: "2px solid #fff",
              background: "var(--theme-primary,#111827)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
            title="Change photo"
          >
            <Camera size={13} />
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
        </div>

        {/* Identity block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800 }}>
            {userProfile.full_name || student?.name || "Student"}
          </h1>
          {profile.headline && (
            <p style={{ margin: "0 0 10px", opacity: 0.85, fontSize: "15px" }}>{profile.headline}</p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "13px", opacity: 0.75 }}>
            {student?.department_name && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <GraduationCap size={14} /> {student.department_name}
              </span>
            )}
            {student?.batch_name && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Layers size={14} /> {student.batch_name}
              </span>
            )}
            {student?.student_id && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Hash size={14} /> {student.student_id}
              </span>
            )}
            {computedCgpa && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Star size={14} /> CGPA: {Number(computedCgpa).toFixed(2)}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: "12px", fontWeight: 600, textDecoration: "none", opacity: 0.9 }}>
                <Linkedin size={15} /> LinkedIn
              </a>
            )}
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: "12px", fontWeight: 600, textDecoration: "none", opacity: 0.9 }}>
                <Github size={15} /> GitHub
              </a>
            )}
            {profile.portfolio_url && (
              <a href={profile.portfolio_url} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "5px", color: "#fff", fontSize: "12px", fontWeight: 600, textDecoration: "none", opacity: 0.9 }}>
                <Globe size={15} /> Portfolio
              </a>
            )}
          </div>
        </div>

        {/* Profile completeness */}
        <div style={{ minWidth: "180px", background: "rgba(255,255,255,0.1)", borderRadius: "14px", padding: "16px" }}>
          <div style={{ marginBottom: "14px" }}>
            <ProfileCompleteness score={completeness} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {cvVersions.length > 0 && (
              <a href={cvVersions.find((c) => c.is_primary)?.file_url ?? cvVersions[0].file_url}
                target="_blank" rel="noreferrer"
                style={{
                  padding: "7px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.2)",
                  color: "#fff", fontSize: "12px", fontWeight: 700, textDecoration: "none",
                  display: "flex", alignItems: "center", gap: "5px",
                }}>
                <FileText size={13} /> View CV
              </a>
            )}
            <span style={{ padding: "7px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
              {projects.length} Projects · {experiences.length} Exp · {certifications.length} Certs
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID: 2/3 + 1/3 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

        {/* LEFT COLUMN */}
        <div>

          {/* ── 1. PERSONAL INFO & INTRO (editable) ── */}
          <SectionCard icon={<User size={16} />} title="Personal Introduction">
            <form onSubmit={saveProfile}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label>Professional Headline</label>
                  <input type="text" placeholder="e.g. Full Stack Developer | Final Year CSE | React & Node.js"
                    value={profile.headline ?? ""}
                    onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label>Personal Introduction</label>
                  <textarea rows={3} placeholder="Write a brief introduction about yourself, your interests and goals…"
                    value={profile.introduction ?? ""}
                    onChange={(e) => setProfile({ ...profile, introduction: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d0d5dd", fontFamily: "inherit", fontSize: "13px" }} />
                </div>
                <div>
                  <label>Contact Phone</label>
                  <input type="tel" placeholder="+91 9876543210" value={profile.phone ?? ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div>
                  <label>Expected Graduation Year</label>
                  <input type="number" placeholder="2026" value={profile.graduation_year ?? ""}
                    onChange={(e) => setProfile({ ...profile, graduation_year: parseInt(e.target.value) || undefined })} />
                </div>
                <div style={{ position: "relative" }}>
                  <label>LinkedIn URL</label>
                  <Linkedin size={14} style={{ position: "absolute", left: "12px", top: "38px", color: "#0a66c2" }} />
                  <input type="url" placeholder="https://linkedin.com/in/username" value={profile.linkedin_url ?? ""}
                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                    style={{ paddingLeft: "34px" }} />
                </div>
                <div style={{ position: "relative" }}>
                  <label>GitHub URL</label>
                  <Github size={14} style={{ position: "absolute", left: "12px", top: "38px", color: "#333" }} />
                  <input type="url" placeholder="https://github.com/username" value={profile.github_url ?? ""}
                    onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                    style={{ paddingLeft: "34px" }} />
                </div>
                <div style={{ position: "relative", gridColumn: "span 2" }}>
                  <label>Portfolio / Personal Website</label>
                  <Globe size={14} style={{ position: "absolute", left: "12px", top: "38px", color: "#64748b" }} />
                  <input type="url" placeholder="https://yourportfolio.dev" value={profile.portfolio_url ?? ""}
                    onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                    style={{ paddingLeft: "34px" }} />
                </div>
              </div>
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="primary-btn" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Save size={15} /> {saving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </form>
          </SectionCard>

          {/* ── 2. SKILLS (editable) ── */}
          <SectionCard icon={<Zap size={16} />} title="Skills">
            <form onSubmit={saveProfile}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "7px" }}>
                    <Code size={14} /> Technical Skills
                  </div>
                  <TagInput tags={profile.technical_skills} onChange={(t) => setProfile({ ...profile, technical_skills: t })}
                    placeholder="React, Python, SQL, Machine Learning…" color="#1e293b" bg="#f1f5f9" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "7px" }}>
                    <User size={14} /> Soft Skills
                  </div>
                  <TagInput tags={profile.soft_skills} onChange={(t) => setProfile({ ...profile, soft_skills: t })}
                    placeholder="Communication, Leadership, Problem Solving…" color="#1e40af" bg="#dbeafe" />
                </div>
              </div>
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="primary-btn" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Save size={15} /> Save Skills
                </button>
              </div>
            </form>
          </SectionCard>

          {/* ── 3. PROJECTS (editable) ── */}
          <SectionCard
            icon={<Code size={16} />}
            title="Projects"
            subtitle="Showcase your technical work"
            action={
              <button className="primary-btn" onClick={() => setProjModal({ open: true })}
                style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", padding: "7px 14px" }}>
                <Plus size={14} /> Add
              </button>
            }
          >
            {projects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "#94a3b8" }}>
                <Code size={36} style={{ margin: "0 auto 10px" }} />
                <p style={{ margin: 0, fontSize: "13px" }}>No projects added yet. Add your GitHub projects, college assignments or side projects.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {projects.map((p) => (
                  <div key={p.id} style={{
                    padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0",
                    background: p.is_featured ? "#fafff4" : "#fafafa",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>{p.title}</span>
                          {p.is_featured && (
                            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "10px", background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>Featured</span>
                          )}
                        </div>
                        {p.description && <p style={{ margin: "4px 0 8px", fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>{p.description}</p>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
                          {p.technologies.map((t) => <TagChip key={t} label={t} color="#1e293b" bg="#f1f5f9" />)}
                        </div>
                        <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                          {p.start_date && <span style={{ color: "#64748b" }}>{p.start_date} – {p.end_date || "Ongoing"}</span>}
                          {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: "3px" }}><Github size={12} /> Repo</a>}
                          {p.demo_url && <a href={p.demo_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: "3px" }}><ExternalLink size={12} /> Demo</a>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => setProjModal({ open: true, editing: p })}
                          style={{ background: "transparent", border: "1px solid #d1d5db", borderRadius: "7px", padding: "5px 8px", cursor: "pointer", color: "#374151" }}>
                          <Edit size={13} />
                        </button>
                        <button onClick={() => deleteProject(p.id)}
                          style={{ background: "transparent", border: "1px solid #fecaca", borderRadius: "7px", padding: "5px 8px", cursor: "pointer", color: "#dc2626" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── 4. WORK EXPERIENCE (editable) ── */}
          <SectionCard
            icon={<Briefcase size={16} />}
            title="Internships & Work Experience"
            action={
              <button className="primary-btn" onClick={() => setExpModal({ open: true })}
                style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", padding: "7px 14px" }}>
                <Plus size={14} /> Add
              </button>
            }
          >
            {experiences.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "#94a3b8" }}>
                <Briefcase size={36} style={{ margin: "0 auto 10px" }} />
                <p style={{ margin: 0, fontSize: "13px" }}>No experience added yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {experiences.map((exp) => (
                  <div key={exp.id} style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                          <span style={{ fontWeight: 700, fontSize: "15px" }}>{exp.role}</span>
                          <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "10px", background: "#dbeafe", color: "#1e40af", fontWeight: 700 }}>
                            {exp.type?.replace("_", " ")}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#475569", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={13} /> {exp.company}
                          {exp.location && <><span>·</span><span>{exp.location}</span></>}
                          {exp.start_date && <><span>·</span><span>{exp.start_date} – {exp.end_date || "Present"}</span></>}
                        </div>
                        {exp.description && <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>{exp.description}</p>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                          {exp.skills_used.map((s) => <TagChip key={s} label={s} color="#1e40af" bg="#dbeafe" />)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "5px", marginLeft: "12px" }}>
                        <button onClick={() => setExpModal({ open: true, editing: exp })}
                          style={{ background: "transparent", border: "1px solid #d1d5db", borderRadius: "7px", padding: "5px 8px", cursor: "pointer" }}>
                          <Edit size={13} />
                        </button>
                        <button onClick={() => deleteExperience(exp.id)}
                          style={{ background: "transparent", border: "1px solid #fecaca", borderRadius: "7px", padding: "5px 8px", cursor: "pointer", color: "#dc2626" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── 5. CERTIFICATIONS & ACHIEVEMENTS (editable) ── */}
          <SectionCard
            icon={<Award size={16} />}
            title="Certifications & Achievements"
            action={
              <button className="primary-btn" onClick={() => setCertModal({ open: true })}
                style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", padding: "7px 14px" }}>
                <Plus size={14} /> Add
              </button>
            }
          >
            {certifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "#94a3b8" }}>
                <Award size={36} style={{ margin: "0 auto 10px" }} />
                <p style={{ margin: 0, fontSize: "13px" }}>No certifications added yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {certifications.map((cert) => (
                  <div key={cert.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#fafafa",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>{cert.title}</span>
                        <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "10px", background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>
                          {cert.type}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {cert.issuing_org && <span>{cert.issuing_org}</span>}
                        {cert.issue_date && <span>Issued: {cert.issue_date}</span>}
                        {cert.expiry_date && <span>Expires: {cert.expiry_date}</span>}
                      </div>
                      {cert.credential_id && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>ID: {cert.credential_id}</div>}
                      {cert.credential_url && (
                        <a href={cert.credential_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: "12px", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: "3px", marginTop: "4px" }}>
                          <CheckCircle size={12} /> Verify Credential
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "5px", marginLeft: "12px" }}>
                      <button onClick={() => setCertModal({ open: true, editing: cert })}
                        style={{ background: "transparent", border: "1px solid #d1d5db", borderRadius: "7px", padding: "5px 8px", cursor: "pointer" }}>
                        <Edit size={13} />
                      </button>
                      <button onClick={() => deleteCert(cert.id)}
                        style={{ background: "transparent", border: "1px solid #fecaca", borderRadius: "7px", padding: "5px 8px", cursor: "pointer", color: "#dc2626" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

        </div>

        {/* RIGHT COLUMN */}
        <div>

          {/* ── OFFICIAL ACADEMIC RECORD (read-only) ── */}
          <SectionCard icon={<GraduationCap size={16} />} title="Official Academic Record" locked>
            <InfoRow label="Full Name" value={student?.name || userProfile.full_name} icon={<User size={14} />} />
            <InfoRow label="Roll / Registration No." value={student?.student_id} icon={<Hash size={14} />} />
            <InfoRow label="Department" value={student?.department_name} icon={<GraduationCap size={14} />} />
            <InfoRow label="Batch" value={student?.batch_name} icon={<Layers size={14} />} />
            {latestSgpa && <InfoRow label={`Current CGPA (Sem ${latestSgpa.semester_no})`} value={`${Number(latestSgpa.cgpa ?? latestSgpa.sgpa).toFixed(2)} / 10`} icon={<Star size={14} />} />}
            {!student && (
              <div style={{ marginTop: "12px", padding: "12px", background: "#fef3c7", borderRadius: "8px", fontSize: "12px", color: "#92400e", display: "flex", gap: "8px" }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
                No institutional record found. Contact your coordinator.
              </div>
            )}
          </SectionCard>

          {/* ── SGPA RECORDS (read-only) ── */}
          {sgpaRecords.length > 0 && (
            <SectionCard icon={<BookOpen size={16} />} title="Semester-wise SGPA" locked>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {sgpaRecords.map((s) => (
                  <div key={s.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: "10px", background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13px" }}>
                        {s.semester_name || `Semester ${s.semester_no}`}
                      </div>
                      {s.backlogs != null && s.backlogs > 0 && (
                        <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>
                          {s.backlogs} Backlog(s)
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: "16px", color: s.sgpa >= 8 ? "#16a34a" : s.sgpa >= 6 ? "#d97706" : "#ef4444" }}>
                        {Number(s.sgpa).toFixed(2)}
                      </div>
                      {s.cgpa && <div style={{ fontSize: "11px", color: "#64748b" }}>CGPA: {Number(s.cgpa).toFixed(2)}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "12px", padding: "10px 12px", background: "#f0fdf4", borderRadius: "8px", fontSize: "12px", color: "#15803d", display: "flex", gap: "6px", alignItems: "center" }}>
                <Lock size={12} /> These records are entered by your coordinator and cannot be modified by students.
              </div>
            </SectionCard>
          )}

          {/* ── BOARD MARKS (student-entered, pending verification) ── */}
          <SectionCard icon={<BookOpen size={16} />} title="Board Examination Marks"
            subtitle="Enter your 10th and 12th marks. Official verification by coordinator.">
            <form onSubmit={saveProfile}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>10th Grade / SSLC Percentage</span>
                    {profile.marks_10th_verified ? (
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
                        <CheckCircle size={11} /> Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>Pending Verification</span>
                    )}
                  </label>
                  <input type="number" step="0.01" min="0" max="100" placeholder="e.g. 87.50"
                    value={profile.marks_10th ?? ""} disabled={profile.marks_10th_verified}
                    onChange={(e) => setProfile({ ...profile, marks_10th: parseFloat(e.target.value) || undefined })} />
                </div>
                <div>
                  <label style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>12th Grade / HSC / Diploma Percentage</span>
                    {profile.marks_12th_verified ? (
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
                        <CheckCircle size={11} /> Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>Pending Verification</span>
                    )}
                  </label>
                  <input type="number" step="0.01" min="0" max="100" placeholder="e.g. 82.00"
                    value={profile.marks_12th ?? ""} disabled={profile.marks_12th_verified}
                    onChange={(e) => setProfile({ ...profile, marks_12th: parseFloat(e.target.value) || undefined })} />
                </div>
                <div>
                  <label>Active Backlogs</label>
                  <input type="number" min="0" value={profile.active_backlogs ?? 0}
                    onChange={(e) => setProfile({ ...profile, active_backlogs: parseInt(e.target.value) || 0 })} />
                </div>
                {(profile.marks_10th_verified || profile.marks_12th_verified) && (
                  <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 12px", background: "#f0fdf4", borderRadius: "8px", display: "flex", gap: "6px" }}>
                    <Lock size={12} style={{ marginTop: "1px", flexShrink: 0 }} />
                    Verified fields are locked. Contact your placement coordinator to update.
                  </div>
                )}
              </div>
              <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="primary-btn" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Save size={14} /> Save
                </button>
              </div>
            </form>
          </SectionCard>

          {/* ── CV / RESUME MANAGER ── */}
          <SectionCard icon={<FileText size={16} />} title="Resume / CV Versions"
            subtitle="Upload multiple CVs. Set one as primary for applications.">
            {/* Upload area */}
            <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #cbd5e1", marginBottom: "16px", textAlign: "center" }}>
              <Upload size={28} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Upload a CV Version</div>
              <input type="text" placeholder="Label (e.g. Frontend Role CV)"
                value={newCvLabel} onChange={(e) => setNewCvLabel(e.target.value)}
                style={{ marginBottom: "10px", textAlign: "center" }} />
              <label className="primary-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                {uploadingCv ? "Uploading…" : <><Upload size={13} /> Choose PDF / DOCX</>}
                <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
                  onChange={handleCvUpload} disabled={uploadingCv} />
              </label>
              <div style={{ marginTop: "6px", fontSize: "11px", color: "#94a3b8" }}>Max 10MB</div>
            </div>

            {/* CV list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {cvVersions.length === 0 && (
                <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", margin: 0 }}>No CVs uploaded yet</p>
              )}
              {cvVersions.map((cv) => (
                <div key={cv.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", borderRadius: "10px",
                  border: cv.is_primary ? "2px solid #22c55e" : "1px solid #e2e8f0",
                  background: cv.is_primary ? "#f0fdf4" : "#fafafa",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <FileText size={14} color={cv.is_primary ? "#16a34a" : "#64748b"} />
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cv.label}
                      </span>
                      {cv.is_primary && (
                        <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "10px", background: "#22c55e", color: "#fff", fontWeight: 700, flexShrink: 0 }}>Primary</span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {cv.file_name} · {new Date(cv.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "5px", marginLeft: "10px" }}>
                    <a href={cv.file_url} target="_blank" rel="noreferrer"
                      style={{ padding: "5px 8px", borderRadius: "7px", border: "1px solid #d1d5db", background: "#fff", display: "flex", alignItems: "center" }}>
                      <ExternalLink size={13} />
                    </a>
                    {!cv.is_primary && (
                      <button onClick={() => setPrimaryCv(cv.id)}
                        style={{ padding: "5px 8px", borderRadius: "7px", border: "1px solid #22c55e", background: "#f0fdf4", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: "#16a34a", whiteSpace: "nowrap" }}>
                        Set Primary
                      </button>
                    )}
                    <button onClick={() => deleteCv(cv.id)}
                      style={{ padding: "5px 8px", borderRadius: "7px", border: "1px solid #fecaca", background: "transparent", cursor: "pointer", color: "#dc2626" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>
      </div>

      {/* ── MODALS ── */}
      {projModal.open && (
        <ProjectModal
          initial={projModal.editing}
          onSave={(data) => saveProject(data, projModal.editing?.id)}
          onClose={() => setProjModal({ open: false })}
        />
      )}
      {expModal.open && (
        <ExperienceModal
          initial={expModal.editing}
          onSave={(data) => saveExperience(data, expModal.editing?.id)}
          onClose={() => setExpModal({ open: false })}
        />
      )}
      {certModal.open && (
        <CertModal
          initial={certModal.editing}
          onSave={(data) => saveCert(data, certModal.editing?.id)}
          onClose={() => setCertModal({ open: false })}
        />
      )}
    </div>
  );
}

