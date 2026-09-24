"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile, UserRole, UserStatus } from "@/app/page";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Calendar,
  Building2,
  ChevronDown,
} from "lucide-react";

type Department = {
  id: string;
  name: string;
  code?: string | null;
};

export default function AdminUserVerification({
  departments = [],
  onReload,
  notify,
  showError,
}: {
  departments?: Department[];
  onReload?: () => void;
  notify?: (msg: string) => void;
  showError?: (msg: string) => void;
}) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (showError) showError(error.message);
    } else {
      setProfiles((data as UserProfile[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function handleStatusChange(userId: string, newStatus: UserStatus) {
    setUpdatingId(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", userId);

    if (error) {
      if (showError) showError(`Failed to update status: ${error.message}`);
    } else {
      if (notify) notify(`User status updated to ${newStatus}.`);
      await fetchProfiles();
      if (onReload) onReload();
    }
    setUpdatingId(null);
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdatingId(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      if (showError) showError(`Failed to update role: ${error.message}`);
    } else {
      if (notify) notify(`User role updated to ${newRole}.`);
      await fetchProfiles();
      if (onReload) onReload();
    }
    setUpdatingId(null);
  }

  const filteredProfiles = profiles.filter((p) => {
    if (statusFilter !== "all" && (p.status || "approved") !== statusFilter) return false;
    if (roleFilter !== "all" && p.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.full_name?.toLowerCase().includes(q);
      const emailMatch = p.email.toLowerCase().includes(q);
      return nameMatch || emailMatch;
    }
    return true;
  });

  const counts = {
    all: profiles.length,
    pending: profiles.filter((p) => p.status === "pending").length,
    approved: profiles.filter((p) => (p.status || "approved") === "approved").length,
    rejected: profiles.filter((p) => p.status === "rejected").length,
    suspended: profiles.filter((p) => p.status === "suspended").length,
  };

  return (
    <div className="admin-verification-container">
      <style>{`
        .admin-verification-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .filter-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #ffffff;
          color: #4b5563;
          transition: all 0.2s ease;
        }
        .filter-pill:hover {
          background: #f3f4f6;
        }
        .filter-pill.active {
          background: #1e293b;
          color: #ffffff;
          border-color: #1e293b;
        }
        .filter-pill.pending.active { background: #d97706; border-color: #d97706; }
        .filter-pill.approved.active { background: #059669; border-color: #059669; }
        .filter-pill.rejected.active { background: #dc2626; border-color: #dc2626; }
        .filter-pill.suspended.active { background: #4b5563; border-color: #4b5563; }
        .pill-count {
          background: rgba(255, 255, 255, 0.25);
          padding: 2px 6px;
          border-radius: 9999px;
          font-size: 0.75rem;
        }
        .user-table-card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        .table-toolbar {
          padding: 16px 20px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #f3f4f6;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f9fafb;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 12px;
          min-width: 260px;
        }
        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: 0.875rem;
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.875rem;
        }
        .users-table th {
          background: #f9fafb;
          padding: 12px 16px;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }
        .users-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        .users-table tr:hover {
          background: #f9fafb;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.approved { background: #d1fae5; color: #065f46; }
        .status-badge.rejected { background: #fee2e2; color: #991b1b; }
        .status-badge.suspended { background: #f3f4f6; color: #4b5563; }
        .role-select {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
        }
        .action-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-approve {
          background: #059669;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s ease;
        }
        .btn-approve:hover { background: #047857; }
        .btn-reject {
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s ease;
        }
        .btn-reject:hover { background: #b91c1c; }
        .btn-suspend {
          background: #4b5563;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s ease;
        }
        .btn-suspend:hover { background: #374151; }
      `}</style>

      {/* FILTER PILLS */}
      <div className="filter-pills">
        <button
          className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          All Users <span className="pill-count">{counts.all}</span>
        </button>
        <button
          className={`filter-pill pending ${statusFilter === "pending" ? "active" : ""}`}
          onClick={() => setStatusFilter("pending")}
        >
          ⏳ Pending <span className="pill-count">{counts.pending}</span>
        </button>
        <button
          className={`filter-pill approved ${statusFilter === "approved" ? "active" : ""}`}
          onClick={() => setStatusFilter("approved")}
        >
          ✅ Approved <span className="pill-count">{counts.approved}</span>
        </button>
        <button
          className={`filter-pill rejected ${statusFilter === "rejected" ? "active" : ""}`}
          onClick={() => setStatusFilter("rejected")}
        >
          ❌ Rejected <span className="pill-count">{counts.rejected}</span>
        </button>
        <button
          className={`filter-pill suspended ${statusFilter === "suspended" ? "active" : ""}`}
          onClick={() => setStatusFilter("suspended")}
        >
          🚫 Suspended <span className="pill-count">{counts.suspended}</span>
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="user-table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} color="#6b7280" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              className="role-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
            >
              <option value="all">Filter by Role: All</option>
              <option value="super_admin">Super Admin</option>
              <option value="coordinator">Coordinator</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>

            <button
              onClick={fetchProfiles}
              className="refresh-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            Loading user list...
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            No user profiles matching the current filter.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Registration Date</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p) => {
                  const status = p.status || "approved";
                  const isUpdating = updatingId === p.id;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {p.full_name || p.email.split("@")[0]}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{p.email}</div>
                      </td>

                      <td>
                        <select
                          className="role-select"
                          value={p.role}
                          disabled={isUpdating}
                          onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                        >
                          <option value="super_admin">⚡ Super Admin</option>
                          <option value="coordinator">👔 Coordinator</option>
                          <option value="teacher">👨‍🏫 Teacher</option>
                          <option value="student">🎓 Student</option>
                        </select>
                      </td>

                      <td style={{ color: "#4b5563" }}>
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </td>

                      <td>
                        <span className={`status-badge ${status}`}>
                          {status === "pending" && "⏳ Pending"}
                          {status === "approved" && "✅ Approved"}
                          {status === "rejected" && "❌ Rejected"}
                          {status === "suspended" && "🚫 Suspended"}
                        </span>
                      </td>

                      <td>
                        <div className="action-btns">
                          {status !== "approved" && (
                            <button
                              className="btn-approve"
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(p.id, "approved")}
                            >
                              <CheckCircle size={13} /> Approve
                            </button>
                          )}
                          {status !== "rejected" && status !== "approved" && (
                            <button
                              className="btn-reject"
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(p.id, "rejected")}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          )}
                          {status === "approved" && (
                            <button
                              className="btn-suspend"
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(p.id, "suspended")}
                            >
                              <AlertTriangle size={13} /> Suspend
                            </button>
                          )}
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
    </div>
  );
}
