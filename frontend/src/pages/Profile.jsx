import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Profile({ user, onUserUpdate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!user || !user.userid) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/auth/insecure/profile?userid=${user.userid}`);
        if (res.data && res.data.success) {
          const updated = res.data.user || res.data.data || null;
          setProfile(updated);
        } else {
          setError(res.data?.message || "Failed to load profile");
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // populate the form when profile loads
  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setEmail(profile.email || "");
    setPassword("");
  }, [profile]);

  if (!user) return <div className="min-h-screen flex items-center justify-center">Please sign in.</div>;

  const onSave = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = { userid: user.userid }; // always include userid
      if (name) payload.name = name;
      if (email) payload.email = email;
      if (password) payload.password = password;

      const res = await api.put(`/auth/insecure/profile`, payload);
      if (res.data && res.data.success) {
        const updated = res.data.user || profile;
        setProfile(updated);
        setSuccess(res.data.message || "Profile updated");
        // propagate update to parent so NavBar shows new name
        try {
          if (typeof onUserUpdate === "function") {
            const merged = { ...(user || {}), ...(updated || {}) };
            onUserUpdate(merged);
          }
        } catch (err) {
          console.warn("onUserUpdate callback threw", err);
        }
        setPassword("");
      } else {
        setError(res.data?.message || "Update failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Delete your account? This cannot be undone.")) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.delete(`/auth/insecure/profile`, { data: { userid: user.userid } });
      if (res.data && res.data.success) {
        // notify parent to clear user and navigate back to login (user deleted)
        try {
          if (typeof onUserUpdate === "function") onUserUpdate(null);
        } catch (err) {
          console.warn("onUserUpdate callback threw", err);
        }
        navigate("/login");
      } else {
        setError(res.data?.message || "Delete failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-8">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-white">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>

        {loading ? (
          <div className="text-sm text-gray-300">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-400 mb-2">{error}</div>
        ) : (
          <form onSubmit={onSave} className="space-y-4 text-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white px-3 py-2 rounded-md text-gray-900" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input value={email} type="email" onChange={(e) => setEmail(e.target.value)} className="w-full bg-white px-3 py-2 rounded-md text-gray-900" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password (leave blank to keep)</label>
              <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} className="w-full bg-white px-3 py-2 rounded-md text-gray-900" />
            </div>

            {success && <div className="text-sm text-green-300">{success}</div>}

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={onDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md">
                Delete
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
