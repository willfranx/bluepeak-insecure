import React, { useState } from "react";
import logoLarge from "../assets/logo-large.png";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    try {
      const payload = { username, password };
      const res = await api.post("/auth/insecure/login", payload);
      const body = res.data;
      const user = body.user || body.data;

      if (!user) {
        setError(body.message || "Login failed");
        return;
      }

      onLogin(user);
      navigate("/accounts");
    } catch (err) {
      if (err.response) {
        setError(
          err.response.data?.message || `Login failed (${err.response.status})`
        );
      } else if (err.request) {
        setError("No response from server");
      } else {
        setError(err.message || "Login error");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-8 gap-4">
      <div className="p-4 flex items-center justify-center">
        <h1 className="text-2xl text-gray-900">Welcome to BluePeak Bank!</h1>
      </div>

      <div className="p-4 flex items-center justify-center">
        <img className="h-40 w-auto" src={logoLarge} alt="Bluepeak bank logo" />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Sign in to view your account
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              value={username}
              placeholder="Username"
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              value={password}
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md bg-white text-gray-900"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              type="submit"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
