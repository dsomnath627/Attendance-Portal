"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("teacher");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split("@")[0],
              role: role,
            },
          },
        });

        if (error) {
          setError(error.message);
        } else if (data?.user) {
          setSuccess("Account created successfully! You can now sign in.");
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setError(error.message);
        }
      }
    } catch (err: any) {
      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to Supabase. Please ensure your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correctly configured in .env.local."
          : err.message || "An unexpected authentication error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="logo-circle">
          {isSignUp ? <UserPlus size={30} /> : <LogIn size={30} />}
        </div>

        <h1>Attendance Portal</h1>

        <p className="subtitle">
          {isSignUp
            ? "Create an Account"
            : "Smart Attendance & Academic Management"}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={!isSignUp ? "active" : ""}
            onClick={() => {
              setIsSignUp(false);
              setError("");
              setSuccess("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={isSignUp ? "active" : ""}
            onClick={() => {
              setIsSignUp(true);
              setError("");
              setSuccess("");
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <>
              <label>I am a</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginBottom: "15px", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", width: "100%", background: "var(--bg-card)", color: "var(--text)" }}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>

              <label>Full Name</label>
              <input
                type="text"
                placeholder="Prof. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
              />
            </>
          )}

          <label>Email</label>
          <input
            type="email"
            placeholder="teacher@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <button
            type="submit"
            className="primary-btn login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="spin" size={18} />
                {isSignUp ? "Creating Account..." : "Signing in..."}
              </>
            ) : isSignUp ? (
              <>
                <UserPlus size={18} />
                Register Account
              </>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}