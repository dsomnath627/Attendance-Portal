"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/Auth";
import App from "@/components/App";
import type { User } from "@supabase/supabase-js";

export type UserRole = "super_admin" | "coordinator" | "teacher" | "student";
export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(currentUser: User) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (data) {
        setProfile({
          ...data,
          status: data.status || "approved",
        } as UserProfile);
      } else if (error) {
        // Fallback profile if record doesn't exist yet
        const defaultProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email || "",
          role: currentUser.user_metadata?.role || "teacher",
          status: "approved",
          full_name: currentUser.email?.split("@")[0] || "Teacher",
        };
        // Try creating fallback profile
        await supabase.from("profiles").upsert(defaultProfile);
        setProfile(defaultProfile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile({
        id: currentUser.id,
        email: currentUser.email || "",
        role: currentUser.user_metadata?.role || "teacher",
        status: "approved",
      });
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(user);
        if (user) {
          await fetchProfile(user);
        }
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loader"></div>
        <p>Loading Attendance Portal...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  if (profile.status !== "approved" && profile.role !== "super_admin") {
    return (
      <div className="loading-page auth-page">
        <div className="auth-card" style={{ textAlign: "center", padding: "40px" }}>
           <h2>Account {profile.status === 'pending' ? 'Pending' : 'Suspended'}</h2>
           <p style={{ marginTop: "10px", color: "var(--text-muted)" }}>
             {profile.status === 'pending' 
               ? "Your account is awaiting super admin verification. Please check back later." 
               : "Your account is currently suspended. Please contact administration."}
           </p>
           <button 
             onClick={() => supabase.auth.signOut()} 
             className="primary-btn" 
             style={{ marginTop: "20px", display: "inline-block" }}>
             Sign Out
           </button>
        </div>
      </div>
    );
  }

  return <App user={user} userProfile={profile} onProfileUpdate={() => fetchProfile(user)} />;
}