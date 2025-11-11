import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv"
import cors from "cors"
import bankAccountRoutes from "./routes/bankAccountRoutes.js"
import userAuthRoutes from "./routes/userAuthRoutes.js"
import transactionRoutes from "./routes/transactionRoutes.js"
import pool from "./db.js";
import morgan from "morgan";

dotenv.config()

const app = express();
const port = process.env.PORT || 8000;
//  format string - log method, route, status, size, and response time
const format = ":method :url :status :res[content-length] - :response-time ms";

//  detailed logs in dev
if (process.env.NODE_ENV === "development") {
  app.use(morgan(format));
} else {
  // Use 'tiny' logs in production,
  app.use(morgan("tiny"));
}
app.use(cors({
  origin: process.env.REACT_CLIENT_URL || "http://localhost:5173",
  credentials: true,
}))

app.use(express.json());
app.use(cookieParser())

app.get("/", (req, res) => {
  res.send("Welcome to the Web Security App API!");
});


// Mount account routes at /accounts
app.use("/api/accounts", bankAccountRoutes);

// Mount authentication routes at /auth
app.use("/api/auth", userAuthRoutes);

// Mount transaction routes at /transaction
app.use("/api/transactions", transactionRoutes)

pool.on("connect", () => {
  console.log("Connected to Bluepeak database")
}) 

pool.on("error", (error) => {
  console.log("Error connecting to the database", error)
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
``