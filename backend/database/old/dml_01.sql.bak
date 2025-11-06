/*
dml_01.sql: Initial version of the bluepeak-bank Database seed data.

defines seed data for the following tables: 
Users, Transactions, and Accounts.
*/

--Seed data for Users table.
INSERT INTO users (name, password) VALUES
('Ahmed', 'Austin123'),
('Chris', '!Portland!'),
('Keegan', 'Pitt5burgh'),
('William', 'Anchorage321'),
('Aswin', '123')
;

--Seed data for Accounts table.
INSERT INTO accounts (userid, type, balance) VALUES
(1, 'checking', 467.00),
(1, 'saving', 80000.00),
(2, 'saving', 1000.00),
(3, 'checking', 0.01),
(4, 'checking', 800.45),
(4, 'saving', 5000.00),
(5, 'checking', 10000.01),
(5, 'saving', 1000000.00)
;

--Seed data for Transactions table.
INSERT INTO transactions (srcid, desid, amount) VALUES
(2, 1, 467.00),
(6, 1, 145.45),
(8, 7, 10.01)
;

