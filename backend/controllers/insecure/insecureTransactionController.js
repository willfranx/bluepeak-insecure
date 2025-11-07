import pool from "../../db.js";

// Represents the bank/system account
const SYSTEM_ACCOUNT_ID = 1;

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

    const updated = await pool.query(
      "UPDATE accounts SET balance = balance + $1 WHERE accountid = $2 RETURNING *",
      [num, accountid]
    );

    const depositRes = await pool.query(
      "INSERT INTO transactions (srcid, desid, amount, type) VALUES ($1, $2, $3, $4) RETURNING *",
      [SYSTEM_ACCOUNT_ID, accountid, num, 'deposit']
    );

    res.status(200).json({ success: true, data: { account: updated.rows[0], transaction: depositRes.rows[0] }, message: "Deposit successful (insecure)" });
  } catch (error) {
    console.error("Insecure deposit error:", error.code, error.message, error.detail || error.stack);
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
      "INSERT INTO transactions (srcid, desid, amount, type) VALUES ($1, $2, $3, $4) RETURNING *",
      [accountid, SYSTEM_ACCOUNT_ID, num, 'withdraw']
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
      "INSERT INTO transactions (srcid, desid, amount, type) VALUES ($1, $2, $3, $4) RETURNING *",
      [srcid, desid, num, 'transfer']
    );

    res.status(200).json({ success: true, data: transaction.rows[0], message: "Transfer successful (insecure)" });
  } catch (error) {
    console.error("Insecure transfer error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Transfer to another user's account by user id or email (insecure)
// Request body can include: { srcid, toUserId } or { srcid, toUserEmail } and optional { toAccountType }
export const transferToUserInsecure = async (req, res) => {
  const { srcid, toUserId, toUserEmail, toAccountType, amount } = req.body || {};

  const num = Number(amount);
  if (!srcid || (!toUserId && !toUserEmail) || !num || num <= 0) {
    return res.status(400).json({ success: false, message: "srcid, recipient (toUserId or toUserEmail), and positive amount required" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // resolve recipient userid if email provided
    let recipientUserId = toUserId;
    if (!recipientUserId && toUserEmail) {
      const u = await client.query('SELECT userid FROM users WHERE email = $1 LIMIT 1', [toUserEmail]);
      if (u.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Recipient user not found' });
      }
      recipientUserId = u.rows[0].userid;
    }

    // find a recipient account
    let findAccountSql = 'SELECT * FROM accounts WHERE userid = $1';
    const findAccountParams = [recipientUserId];
    if (toAccountType) {
      findAccountSql += ' AND type = $2 LIMIT 1';
      findAccountParams.push(toAccountType);
    } else {
      findAccountSql += ' ORDER BY accountid LIMIT 1';
    }

    const rAcc = await client.query(findAccountSql, findAccountParams);
    if (rAcc.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Recipient account not found' });
    }
    const destAccountId = rAcc.rows[0].accountid;

    // Atomically debit source if sufficient funds
    const debit = await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE accountid = $2 AND balance >= $1 RETURNING *',
      [num, srcid]
    );
    if (debit.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Insufficient funds or source account missing' });
    }

    // Credit destination
    const credit = await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE accountid = $2 RETURNING *',
      [num, destAccountId]
    );

    // Insert transaction record
    const tx = await client.query(
      'INSERT INTO transactions (srcid, desid, amount, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [srcid, destAccountId, num, 'OtherUser']
    );

    await client.query('COMMIT');

    return res.status(200).json({ success: true, data: { transaction: tx.rows[0], from: debit.rows[0], to: credit.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Insecure transferToUser error:', err.code, err.message, err.detail || err.stack);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    client.release();
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
      `SELECT t.*, src.type AS src_type, des.type AS des_type
       FROM transactions t
       LEFT JOIN accounts src ON t.srcid = src.accountid
       LEFT JOIN accounts des ON t.desid = des.accountid
       WHERE (t.srcid = $1 OR t.desid = $1)
          OR (t.srcid = $2 AND t.desid = $1)
          OR (t.srcid = $1 AND t.desid = $2)
       ORDER BY t.transactionid DESC`,
      [accountid, SYSTEM_ACCOUNT_ID]
    );

    res.status(200).json({ success: true, data: transactions.rows });
  } catch (error) {
    console.error("Insecure getTransactions error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export default { depositInsecure, withdrawInsecure, transferInsecure, transferToUserInsecure, getTransactionsInsecure };
