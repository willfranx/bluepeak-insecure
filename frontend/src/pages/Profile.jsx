import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !user.userid) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/auth/insecure/profile?userid=${user.userid}`);
        if (res.data && res.data.success) {
          setProfile(res.data.user || res.data.data || null);
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

  if (!user) return <div className="min-h-screen flex items-center justify-center">Please sign in.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-8">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-white">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>

        {loading ? (
          <div className="text-sm text-gray-300">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : profile ? (
          <div className="space-y-2 text-gray-200">
            <div><strong>Name:</strong> {profile.name}</div>
            <div><strong>Email:</strong> {profile.email}</div>
            <div><strong>User ID:</strong> {profile.userid}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">No profile data available.</div>
        )}
      </div>
    </div>
  );
}
