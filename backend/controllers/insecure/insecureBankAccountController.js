import pool from "../../db.js";

// Create a new account for an existing user (no auth required)
export const createAccountInsecure = async (req, res) => {
  const { userid, type, balance } = req.body;

  if (!userid || !type) {
    return res.status(400).json({ success: false, message: "User ID and account type are required" });
  }

  if (type !== "checking" && type !== "saving") {
    return res.status(400).json({
      success: false,
      message: "Account type must be 'checking' or 'saving'",
    });
  }

  try {
    // Check if user exists
    const userExists = await pool.query("SELECT 1 FROM users WHERE userid = $1 LIMIT 1", [userid]);
    if (userExists.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Create account
    const result = await pool.query(
      "INSERT INTO accounts (userid, type, balance) VALUES ($1, $2, COALESCE($3, 0.00)) RETURNING *",
      [userid, type, balance ?? 0.0]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Account created successfully (insecure)",
    });
  } catch (error) {
    console.error("Insecure create account error:", error);
    res.status(500).json({ success: false, message: "Error creating account" });
  }
};

// Get all accounts for a specific user (no auth required)
export const getUserAccountsInsecure = async (req, res) => {
  const { userid } = req.params;

  if (!userid) {
    return res.status(400).json({ success: false, message: "userid param required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM accounts WHERE userid = $1 ORDER BY accountid ASC",
      [userid]
    );

    // Return empty array when none found to make client logic simpler
    return res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error("Insecure getUserAccounts error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Delete a user's account (only if no transactions exist) — no auth
export const deleteAccountInsecure = async (req, res) => {
  const { accountid } = req.params;

  if (!accountid) {
    return res.status(400).json({ success: false, message: "accountid param required" });
  }

  try {
    // Check for existing transactions
    const hasTransactions = await pool.query(
      "SELECT 1 FROM transactions WHERE srcid = $1 OR desid = $1 LIMIT 1",
      [accountid]
    );

    if (hasTransactions.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Account has existing transactions and cannot be deleted",
      });
    }

    // Delete account
    const result = await pool.query(
      "DELETE FROM accounts WHERE accountid = $1 RETURNING *",
      [accountid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: "Account deleted successfully (insecure)",
    });
  } catch (error) {
    console.error("Insecure delete account error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export default { createAccountInsecure, getUserAccountsInsecure, deleteAccountInsecure };
