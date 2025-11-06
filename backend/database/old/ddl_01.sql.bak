/*
ddl_01.sql: Initial version of the bluepeak-bank Database.

defines the following tables: 
Users, Transactions, and Accounts.
*/

--Initialize Users table:
CREATE TABLE IF NOT EXISTS users (
    userid SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

--Initialize Accounts table:
CREATE TABLE IF NOT EXISTS accounts (
    accountid SERIAL PRIMARY KEY,
    userid INTEGER,
    type VARCHAR(8) NOT NULL,
    balance NUMERIC(12,2) DEFAULT 0.00,
    --validate accountType
    CHECK (type in ('checking', 'saving')),
    FOREIGN KEY (userid) REFERENCES users(userid)
        --When a user is deleted, their account is perserved.
        ON DELETE SET NULL                           
);

--Initialize Transactions table:
CREATE TABLE IF NOT EXISTS transactions (
    transactionid SERIAL PRIMARY KEY,
    srcid INTEGER NOT NULL,
    desid INTEGER NOT NULL,
    amount NUMERIC(12,2) DEFAULT 0.01,
    --no negative transfer amounts
    CHECK (amount > 0.00),
    --sourceAccount cannot be destinationAccount
    Check (srcid <> desid),
    --When an account is deleted the transaction is perserved.
    FOREIGN KEY (srcid) REFERENCES accounts(accountid)
        ON DELETE RESTRICT,
    FOREIGN KEY (desid) REFERENCES accounts(accountid)
        ON DELETE RESTRICT
);