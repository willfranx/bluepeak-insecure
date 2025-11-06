import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import pool from "../db.js";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: 'Strict',
    maxAge: 5 * 60 * 1000 // 5 minutes
};

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "5m" // 5 minutes
  });
};

// Tests a new password to see if meets the password policy. 
// Returns True if password meets requirements
const passwordRequirementsMet = (password) => {
  const minLength = 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return ( 
    password.length >= minLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial
  );
};

//Returns true if a user exists
const userCheck = async (email) => {
    try {
        const checkEmail = await pool.query( "SELECT * FROM users where email =$1", [email] );
        
        return checkEmail.rows.length > 0;
    } catch (error) {
            console.error("checkUser: error checking for user by email", error);
            throw error;
    }
};

/* isAuthSuspicious - sets users.islocked and users.lockoutend
- locked the user if 5 Failed authentication attepts are recorded in a row

Returns:
- True if isAuthSuspicious locked the account
- False otherwise
*/
const isAuthSuspicious = async (userid) => {
  
  if (!userid) {
    console.error("No userid provided to checkUserAuthEvents");
    return false;
  }

  try {
    // pull recent events for the user, newest first
    const eventsResult = await pool.query(`
      SELECT e.event, ue.created
      FROM userevents ue
      JOIN events e ON ue.eventid = e.eventid
      WHERE ue.userid = $1
      ORDER BY ue.created DESC
      LIMIT 10
    `, [userid]);

    let failedCount = 0;

    // Count up to 5 failed authentication attempts
    for (const row of eventsResult.rows) {
      if (row.event === 'Failed Authentication') {
        failedCount++;
      } else if (row.event === 'Successful Authentication' || row.event === 'Account Unlocked') {
        // account was not found to be suspicious
        return false;
      }

      if (failedCount === 5) {
        // update user record for a 1 minute lockout
        const lockoutDurationMs = 1 * 60 * 1000; // 1 minute lockout
        const lockoutend = new Date(Date.now() + lockoutDurationMs);
        await pool.query(
          "UPDATE users SET islocked = TRUE, lockoutend = $1, updated = CURRENT_TIMESTAMP WHERE userid = $2",
          [lockoutend, userid]
        );

        // account was just locked
        return true;
      }
    }
    // catch all case: not enought records
    return false
  } catch (error) {
    console.error("Error during isAuthSuspicious", error);
    throw error;
  }
};

/* isUserLocked - Returns:
  - True: if a user is locked
  - False: if a user is not locked
*/
const isUserLocked = async (userid, islocked, lockoutend) => {
  
  if (!userid){
    console.error("isUserLocked: missing userid");
    return false;
  }

  try {

    const now = new Date();

    //Case: lockoutend is passed or account was never locked
    if (!lockoutend || new Date(lockoutend) <= now) {
      
      // Since lockoutend is passed ensure islocked is unset.      
      if (islocked) {

        await pool.query(
          "UPDATE users SET islocked = FALSE, lockoutend = NULL, updated = CURRENT_TIMESTAMP WHERE userid = $1",
          [userid]
        );
      } 

      // Case: lockoutend is passed and islocked is false. check for suspicious auth attempts and lock if needed
      await isAuthSuspicious(userid)
    }
    // Case: lockoutend has not been passed
    if (new Date(lockoutend) > now && !islocked) { 

        // since lockoutend has not been passed ensure islocked is set
        await pool.query(
          "UPDATE users SET islocked = TRUE, updated = CURRENT_TIMESTAMP WHERE userid = $1",
          [userid]
        );
      } 
    
    // final return
    const finalIsLocked = await pool.query(
        "SELECT islocked FROM users WHERE userid = $1",
        [userid]
    );

    if (finalIsLocked.rows.length < 1) {
      console.error(`isUserLocked: No user found for ${email}`);
      return false;
    }

    if (finalIsLocked.rows[0].islocked === true) {
        return true;
    } else return false;

  } catch (error) {
        console.error("Error checking if user is locked:", error);
        throw error;
    }
};

//Record user events
const logUserEvent = async (userid, event) => {
    try {
    // Get the eventid 
    const eventResult = await pool.query(
      "SELECT eventid FROM events WHERE event = $1",
      [event]
    );

    if (eventResult.rows.length === 0) {
      console.error(`logUserEvent: "${event}" not found`);
      return;
    }

    const eventid = eventResult.rows[0].eventid;

    // record the event
    await pool.query(
      "INSERT INTO userevents(userid, eventid) VALUES ($1, $2)",
      [userid, eventid]
    );
  } catch (error) {
    console.error(`logUserEvent: logging event "${event}" for user ${userid}:`, error);
  }
};

// Register a new user
export const register = async (req, res) => {
    const { name, email, password} = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    try {
    
        // Check if the user exists in the database       
        if ((await userCheck(email))) { 
            return res.status(400).json({ success: false, message: "This email is already linked to an account" }); 
        }

        // Check if the password meets the password policy
        if (!passwordRequirementsMet(password)) {
            return res.status(400).json({ success: false,
                message: "Password must contain: 12 characters, 1 upper case, 1 lower case, 1 number, and 1 symbol." }); 
        }

        const hashedPassword = await bcrypt.hash(password, 12) // TODO: Replace with ARGON2id. bcrypt is for legacy 
        
        // insert user into users table
        const newUser = await pool.query(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING userid, name, email",
            [name, email]
        )

        if (newUser.rows.length < 1) {
            return res.status(400).json({ success: false, message: "failed to add to users table" });
        }

        // insert the password into the passwords table. set iscurrent and link with userid.
        await pool.query(
            `INSERT INTO passwords (userid, hash, iscurrent)
             VALUES ($1, $2, TRUE)`,
            [newUser.rows[0].userid, hashedPassword]
        );

        const token = createToken(newUser.rows[0].userid); 
        
        res.cookie("token", token, cookieOptions); 
        
        res.status(201).json({ success: true, data: newUser.rows[0], message: "User added successfully!" });

    } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).json({ success: false, message: "Error adding user" });
    }
};

// Login user
export const login = async (req, res) => {

    const { email, password} = req.body

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and Password are required" });
    }

    try {

        const findUser = await pool.query(
        "SELECT * FROM users WHERE email = $1 OR name = $1", [email]);

        if (findUser.rows.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        const user = findUser.rows[0];

        // check if the user is locked out
        if (await isUserLocked(user.userid, user.islocked, user.lockoutend)){
            return res.status(400).json({ success: false, message: "Account Is Locked" });
        }

        // get the password
        const passwordResult = await pool.query(
            "SELECT * FROM passwords WHERE userid = $1 AND iscurrent = true", [user.userid]
        );

        if (passwordResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: `Login Error: no current password found for userid ${user.userid}` });
        }

        const currentPassword = passwordResult.rows[0]

        const isMatch = await bcrypt.compare(password, currentPassword.hash); // todo: need to replace with argo2id

        if (!isMatch) {
            // log the failed login attempt
            await logUserEvent(user.userid, "Failed Authentication");

            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        const token = createToken(user.userid)
        res.cookie("token", token, cookieOptions)

        // log the successful login
        await logUserEvent(user.userid, "Successful Authentication");

        res.status(200).json({success: true,message: `Welcome ${user.name}`, 
            user: { userid: user.userid, name: user.name, email: user.email }
        })

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}


// Logout the user 
export const logout = async (req, res) => {
    res.cookie("token", "", { ...cookieOptions, maxAge: 0 });
    res.status(200).json({ success: true, message: "User is logged out" });
};


// User profile is protected and returns info for only logged in users
export const profile = async (req, res) => {
    res.json(req.user)
}
