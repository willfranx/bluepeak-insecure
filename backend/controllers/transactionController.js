import pool from "../db.js";

// Represents the bank/system account
const SYSTEM_ACCOUNT_ID = 0;

// Deposit money into an account
export const deposit = async (req, res) => {
    
    const { accountid, amount } = req.body;

    if (!accountid || !amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Valid account ID and amount are required" })
    }

    try {
        const account = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [accountid]);

        if (account.rowCount === 0 || account.rows[0].userid !== req.user.userid) {
        return res.status(403).json({ success: false, message: "Forbidden. Cannot deposit to this account"})
        }

        const newBalance = account.rows[0].balance + amount;

        await pool.query("UPDATE accounts SET balance = $1 WHERE accountid = $2", [newBalance,accountid])

        const deposit = await pool.query("INSERT INTO transactions (srcid, desid, amount, type) VALUES ($1, $2, $3, $4) RETURNING *",
        [SYSTEM_ACCOUNT_ID, accountid, amount, "deposit"]
        )

        res.status(200).json({ success: true, data: deposit.rows[0], message: "Deposit successful" })

    } catch (error) {
        console.error("Deposit error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Withdraw money from an account
export const withdraw = async (req, res) => {
    
    const { accountid, amount } = req.body;

    if (!accountid || !amount || amount <= 0) {
        return res.status(400).json({success: false, message: "Valid account ID and amount are required"})
    }

    try {
        
        const account = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [accountid])

        if (account.rowCount === 0 || account.rows[0].userid !== req.user.userid) {
            return res.status(403).json({success: false, message: "Forbidden. Cannot withdraw from this account"})
        }

        if (account.rows[0].balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient balance" });
        }

        const newBalance = account.rows[0].balance - amount;

        await pool.query("UPDATE accounts SET balance = $1 WHERE accountid = $2", [newBalance,accountid])

        const transaction = await pool.query(
            "INSERT INTO transactions (srcid, desid, amount, type) VALUES ($1, $2, $3, $4) RETURNING *",
            [accountid, SYSTEM_ACCOUNT_ID, amount, "withdraw"]
        )

        res.status(200).json({success: true, data: transaction.rows[0], message: "Withdrawal successful" })

    } catch (error) {
        console.error("Withdraw error:", error)
        res.status(500).json({ success: false, message: "Internal Server Error" })
    }
};

// Transfer money between accounts
export const transfer = async (req, res) => {
    
    const { srcid, desid, amount } = req.body;

    if (!srcid || !desid || !amount || amount <= 0) {
        return res.status(400).json({success: false, message: "Valid source, destination, and amount are required" })
    }

    try {
        
        const srcAccount = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [srcid])
        const desAccount = await pool.query("SELECT * FROM accounts WHERE accountid = $1", [desid]) 

        if ( srcAccount.rowCount === 0 || desAccount.rowCount === 0 || srcAccount.rows[0].userid !== req.user.userid ) {
            return res.status(403).json({ success: false, message: "Forbidden. Cannot transfer from this account" })
        }

        if (srcAccount.rows[0].balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient balance" })
        }

        await pool.query("UPDATE accounts SET balance = balance - $1 WHERE accountid = $2", [amount, srcid])
        await pool.query("UPDATE accounts SET balance = balance + $1 WHERE accountid = $2", [amount, desid])

        const transaction = await pool.query( "INSERT INTO transactions (srcid, desid, amount, type) VALUES ($1, $2, $3, $4) RETURNING *",
            [srcid, desid, amount, "transfer"]
        )

        res.status(200).json({ success: true, data: transaction.rows[0], message: "Transfer successful" })

    } catch (error) {
        console.error("Transfer error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" })
    }

};

// Get transactions for an account
export const getTransactions = async (req, res) => {
    
    const { accountid } = req.params;

    try {
        
        const account = await pool.query( "SELECT * FROM accounts WHERE accountid = $1", [accountid])

        if (account.rowCount === 0 || account.rows[0].userid !== req.user.userid) {
            return res.status(403).json({success: false, message: "Forbidden. Cannot view transactions for this account"})
        }

        const transactions = await pool.query("SELECT * FROM transactions WHERE srcid = $1 OR desid = $1 ORDER BY transactionid DESC",
            [accountid]
        );

        res.status(200).json({ success: true, data: transactions.rows })

    } catch (error) {
        console.error("Get transactions error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" })
    }

};
