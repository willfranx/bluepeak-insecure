import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function SignUp({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const payload = { name, email, password };
      const res = await api.post("/auth/insecure/register", payload);
      const body = res.data;
      if (body && body.success && body.user) {
        const user = body.user;

        // Create default checking and saving accounts for the new user (insecure endpoints)
        // Use random starting balances (between $50 and $500) so accounts are usable for testing.
        const randAmount = () => Number((Math.random() * (500 - 50) + 50).toFixed(2));

        try {
          await api.post("/accounts/insecure/", { userid: user.userid, type: "checking", balance: randAmount() });
        } catch (acctErr) {
          // Non-blocking: warn but continue
          console.warn("Failed to create checking account for new user:", acctErr?.response?.data || acctErr);
        }

        try {
          await api.post("/accounts/insecure/", { userid: user.userid, type: "saving", balance: randAmount() });
        } catch (acctErr) {
          console.warn("Failed to create saving account for new user:", acctErr?.response?.data || acctErr);
        }

        // Now notify parent (login) and navigate so App can fetch accounts
        if (typeof onLogin === "function") onLogin(user);
        navigate("/accounts");
      } else {
        setError(body?.message || "Registration failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Sign up error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-8 gap-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create an account</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="you@example.com"
              type="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Password"
              type="password"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
