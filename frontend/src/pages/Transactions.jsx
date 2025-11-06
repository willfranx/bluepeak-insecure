import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Transactions({ user, accounts = [] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.accountid || "");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (accounts && accounts.length && !accountId) {
      setAccountId(accounts[0].accountid || accounts[0].id || "");
    }
  }, [accounts]);

  useEffect(() => {
    if (!accountId) return;

    const fetchTransactions = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/transactions/insecure/${accountId}`);
        if (res.data && res.data.success) {
          setTransactions(res.data.data || []);
        } else {
          setError(res.data?.message || "Failed to load transactions");
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Error");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [accountId]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">Please sign in to view transactions.</div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white py-8 gap-6">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Transactions</h2>
          <div>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="px-3 py-2 rounded-md bg-gray-900 text-gray-100"
            >
              {accounts.map((a) => (
                <option key={a.accountid || a.id} value={a.accountid || a.id}>
                  {a.type || `Account ${a.accountid || a.id}`} (${Number(a.balance || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-300">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-200">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-2">ID</th>
                <th className="py-2">Source</th>
                <th className="py-2">Destination</th>
                <th className="py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-400">
                    No transactions for this account.
                  </td>
                </tr>
              )}

              {transactions.map((t) => (
                <tr key={t.transactionid} className="border-b border-gray-700">
                  <td className="py-2">{t.transactionid}</td>
                  <td className="py-2">{t.srcid}</td>
                  <td className="py-2">{t.desid}</td>
                  <td className="py-2">${Number(t.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
