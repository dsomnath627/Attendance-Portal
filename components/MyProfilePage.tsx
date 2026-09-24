"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/app/page";
import { User, Image as ImageIcon, Save, CheckCircle } from "lucide-react";

export default function MyProfilePage({
  userProfile,
  onReload,
}: {
  userProfile: UserProfile;
  onReload: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(userProfile.full_name || "");
  const [bio, setBio] = useState(userProfile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatar_url || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          bio: bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userProfile.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      await onReload();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <style>{`
        .profile-container {
          max-width: 600px;
          margin: 0 auto;
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }
        .profile-avatar-preview {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
          color: #94a3b8;
          border: 2px solid #e2e8f0;
          overflow: hidden;
          flex-shrink: 0;
        }
        .profile-avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .profile-form-group {
          margin-bottom: 20px;
        }
        .profile-form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #475467;
          font-size: 14px;
        }
        .profile-form-group input, .profile-form-group textarea {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #d0d5dd;
          background: white;
          font-size: 15px;
        }
        .profile-form-group textarea {
          resize: vertical;
          min-height: 100px;
        }
        .profile-form-group input:focus, .profile-form-group textarea:focus {
          outline: 2px solid var(--theme-accent);
          border-color: transparent;
        }
      `}</style>

      <div className="profile-container">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>My Profile</h2>
              <p>Update your personal information and preferences.</p>
            </div>
            <User />
          </div>

          {message && (
            <div className={message.type === 'success' ? 'success-alert' : 'error-alert'} style={{ marginBottom: '24px', marginLeft: 0, marginRight: 0 }}>
              {message.text}
            </div>
          )}

          <div className="profile-header">
            <div className="profile-avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                (fullName || userProfile.email).charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px', fontSize: '20px' }}>{fullName || 'No Name Set'}</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{userProfile.email}</p>
              <span className={`role-badge badge-${userProfile.role}`} style={{ display: 'inline-block', marginTop: '8px' }}>
                {userProfile.role === 'super_admin' ? '⚡ Super Admin' : userProfile.role === 'coordinator' ? '👔 Coordinator' : userProfile.role === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}
              </span>
            </div>
          </div>

          <div className="profile-form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="profile-form-group">
            <label>Profile Picture URL</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                style={{ paddingLeft: '40px' }}
              />
              <ImageIcon size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            </div>
          </div>

          <div className="profile-form-group">
            <label>Bio / Details</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a little bit about yourself..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button className="primary-btn" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : (
                <>
                  <Save size={16} /> Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
