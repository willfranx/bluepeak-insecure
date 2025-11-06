import pool from "../../db.js";

// Represents the bank/system account
const SYSTEM_ACCOUNT_ID = 0;

// Deposit money into an account (no auth required)
export const depositInsecure = async (req, res) => {
  const { accountid, amount } = req.body;

  const num = Number(amount);
  if (!accountid || !num || num <= 0) {
    return res.status(400).json({ success: false, message: "Valid account ID and amount are required" });
  }

  try {
    const account = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [accountid]);

    if (account.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const newBalance = account.rows[0].balance + num;

    await pool.query("UPDATE accounts SET balance = $1 WHERE accountid = $2", [newBalance, accountid]);

    const depositRes = await pool.query(
      "INSERT INTO transactions (srcid, desid, amount) VALUES ($1, $2, $3) RETURNING *",
      [SYSTEM_ACCOUNT_ID, accountid, num]
    );

    res.status(200).json({ success: true, data: depositRes.rows[0], message: "Deposit successful (insecure)" });
  } catch (error) {
    console.error("Insecure deposit error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Withdraw money from an account (no auth required)
export const withdrawInsecure = async (req, res) => {
  const { accountid, amount } = req.body;

  const num = Number(amount);
  if (!accountid || !num || num <= 0) {
    return res.status(400).json({ success: false, message: "Valid account ID and amount are required" });
  }

  try {
    const account = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [accountid]);

    if (account.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    if (account.rows[0].balance < num) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const newBalance = account.rows[0].balance - num;

    await pool.query("UPDATE accounts SET balance = $1 WHERE accountid = $2", [newBalance, accountid]);

    const transaction = await pool.query(
      "INSERT INTO transactions (srcid, desid, amount) VALUES ($1, $2, $3) RETURNING *",
      [accountid, SYSTEM_ACCOUNT_ID, num]
    );

    res.status(200).json({ success: true, data: transaction.rows[0], message: "Withdrawal successful (insecure)" });
  } catch (error) {
    console.error("Insecure withdraw error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Transfer money between accounts (no auth required)
export const transferInsecure = async (req, res) => {
  const { srcid, desid, amount } = req.body;

  const num = Number(amount);
  if (!srcid || !desid || !num || num <= 0) {
    return res.status(400).json({ success: false, message: "Valid source, destination, and amount are required" });
  }

  try {
    const srcAccount = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [srcid]);
    const desAccount = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [desid]);

    if (srcAccount.rowCount === 0 || desAccount.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Source or destination account not found" });
    }

    if (srcAccount.rows[0].balance < num) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    await pool.query("UPDATE accounts SET balance = balance - $1 WHERE accountid = $2", [num, srcid]);
    await pool.query("UPDATE accounts SET balance = balance + $1 WHERE accountid = $2", [num, desid]);

    const transaction = await pool.query(
      "INSERT INTO transactions (srcid, desid, amount) VALUES ($1, $2, $3) RETURNING *",
      [srcid, desid, num]
    );

    res.status(200).json({ success: true, data: transaction.rows[0], message: "Transfer successful (insecure)" });
  } catch (error) {
    console.error("Insecure transfer error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get transactions for an account (no auth required)
export const getTransactionsInsecure = async (req, res) => {
  const { accountid } = req.params;

  if (!accountid) {
    return res.status(400).json({ success: false, message: "accountid param required" });
  }

  try {
    const account = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [accountid]);

    if (account.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const transactions = await pool.query(
      "SELECT * FROM transactions WHERE srcid = $1 OR desid = $1 ORDER BY transactionid DESC",
      [accountid]
    );

    res.status(200).json({ success: true, data: transactions.rows });
  } catch (error) {
    console.error("Insecure getTransactions error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export default { depositInsecure, withdrawInsecure, transferInsecure, getTransactionsInsecure };
