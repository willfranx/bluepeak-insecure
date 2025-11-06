import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Accounts({ accounts: initialAccounts = [], user }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchAccounts = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/accounts/insecure/${user.userid}`);
        // backend returns { success: true, data: [...] }
        if (res.data && res.data.success) {
          setAccounts(res.data.data || []);
        } else {
          setError(res.data?.message || "Failed to load accounts");
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Error fetching accounts"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 py-8 gap-6">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-white mb-4">Your Accounts</h2>

        {loading ? (
          <div className="text-sm text-gray-300">Loading accounts...</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {accounts.map((a) => (
              <li
                key={a.accountid}
                className="py-3 flex items-center justify-between"
              >
                <div className="text-gray-200">
                  {a.type || `Account ${a.accountid}`}
                </div>
                <div className="text-white font-medium">
                  ${Number(a.balance || 0).toFixed(2)}
                </div>
              </li>
            ))}
            {accounts.length === 0 && (
              <li className="py-4 text-center text-sm text-gray-500">
                No accounts to display.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
