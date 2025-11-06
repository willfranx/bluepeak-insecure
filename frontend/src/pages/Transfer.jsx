import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function Transfer({ accounts = [], onTransfer }) {

  const [fromId, setFromId] = useState(accounts[0]?.accountid || "");
  const [toId, setToId] = useState(accounts[1]?.accountid || "");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

    useEffect(() => {
      setFromId(accounts[0]?.accountid || "");
      setToId(accounts[1]?.accountid || "");
    }, [accounts]);

  const send = async (e) => {
    e.preventDefault();
    setMessage("");

    const num = Number(amount);
    if (!fromId || !toId || !num || num <= 0) {
      setMessage("Please pick accounts and a valid amount");
      return;
    }
    if (fromId === toId) {
      setMessage("Cannot transfer to the same account");
      return;
    }

    const from = accounts.find(
      (a) =>
        (a.accountid) === fromId ||
        String(a.accountid) === String(fromId)
    );

    if (!from || Number(from.balance) < num) {
      setMessage("Insufficient funds");
      return;
    }

    setLoading(true);

    try {
      // Call insecure transfer endpoint mounted under /api/transactions/insecure/transfer
      const payload = { srcid: fromId, desid: toId, amount: num };
      const res = await api.post(`/transactions/insecure/transfer`, payload);

      if (res.data && res.data.success) {
        setMessage("Transfer complete");
        setAmount("");
        // let parent update local balances if it wants to
        if (typeof onTransfer === "function")
          onTransfer({ fromId, toId, amount: num });
      } else {
        setMessage(res.data?.message || "Transfer failed");
      }
    } catch (err) {
      setMessage(
        err.response?.data?.message || err.message || "Transfer error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-8">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-white mb-4">
          Transfer Funds
        </h2>
        <form onSubmit={send} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              From
            </label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100"
            >
              {accounts.map((a) => {
                const id = a.accountid;
                const label = a.type || `Account ${id}`;
                return (
                  <option key={id} value={id}>
                    {label} (${Number(a.balance || 0).toFixed(2)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              To
            </label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100"
            >
              {accounts.map((a) => {
                const id = a.accountid;
                const label = a.type || `Account ${id}`;
                return (
                  <option key={id} value={id}>
                    {label} (${Number(a.balance || 0).toFixed(2)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Amount
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100"
            />
          </div>

          <div>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
        {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
      </div>
    </div>
  );
}
