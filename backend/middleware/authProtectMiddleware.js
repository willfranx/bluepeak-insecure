import jwt from "jsonwebtoken"
import pool from "../db.js"

export const protect = async (req, res, next) => {
    try {

        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authorized: no token" });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const { id } = decodedToken;

        const getUser = await pool.query("SELECT userid, name, email FROM users WHERE userid = $1", [id]);

        if (getUser.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Not authorized: user not found" });
        }

        req.user = getUser.rows[0]
        next();

    } catch (error) {
        console.error("Auth middleware error:", error.message);
        res.status(401).json({ success: false, message: "Not authorized" });
    }
}