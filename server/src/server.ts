import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { db, connectDB } from "./db";

const app = express();
const PORT = 5001;

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

app.use(cors());
app.use(express.json());

// Initialize Database
connectDB();

app.get("/", (req: Request, res: Response) => {
    res.send("Backend running!");
});

app.post("/api/register", async (req: Request, res: Response) => {
    const { firstName, lastName, nickname, email, username, password } = req.body;

    if (!firstName || !lastName || !nickname || !email || !username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {

        const [existingUsers] = await db.query(
            "SELECT email, username, nickname FROM users WHERE email = ? OR username = ? OR nickname = ?",
            [email, username, nickname]
        ) as any[];

        if (existingUsers.length > 0) {
            const user = existingUsers[0];
            if (user.email === email) return res.status(400).json({ message: "Email already in use" });
            if (user.username === username) return res.status(400).json({ message: "Username already taken" });
            if (user.nickname === nickname) return res.status(400).json({ message: "Nickname already taken" });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user first
        const [insertUserResult] = await db.query(
            "INSERT INTO users (first_name, last_name, nickname, email, username, password_hash, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [firstName, lastName, nickname, email, username, hashedPassword, 1]
        ) as any[];
        
        const userId = insertUserResult.insertId;
        console.log('✓ User created with ID:', userId);

        // Generate verification token
        const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log('✓ Generated verification token:', verificationToken);

        // Calculate expiration time (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        console.log('✓ Token expires at:', expiresAt.toISOString());

        // Store token in email_verifications table
        await db.query(
            "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)",
            [userId, verificationToken, expiresAt]
        );
        console.log('✓ Token stored in email_verifications table');

        // Send verification email
        const verificationLink = `http://localhost:5174/verify?token=${encodeURIComponent(verificationToken)}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify your email - BillSplit',
            html: `
                <h2>Email Verification</h2>
                <p>Click the link below to verify your email:</p>
                <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Verify Email
                </a>
                <p>Or copy this link: ${verificationLink}</p>
                <p>This link expires in 24 hours.</p>
            `,
        };

        transporter.sendMail(mailOptions, (error: any, info: any) => {
            if (error) {
                console.error('✗ Error sending email:', error);
            } else {
                console.log('✓ Email sent successfully to:', email);
            }
        });

        res.status(201).json({ message: "User registered successfully. Please check your email to verify your account." });
    } catch (error: any) {
        console.error("Registration error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/api/verify", async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
    }

    try {
        console.log('\n=== EMAIL VERIFICATION REQUEST ===' );
        console.log('Token received:', token);
        
        // Check if token exists and is not expired
        const [verificationRecords] = await db.query(
            "SELECT id, user_id, expires_at, verified_at FROM email_verifications WHERE token = ?",
            [token]
        ) as any[];
        
        console.log('Database query executed');
        console.log('Records found:', verificationRecords?.length);
        
        if (!verificationRecords || verificationRecords.length === 0) {
            console.log('✗ No verification record found for token');
            return res.status(400).json({ message: "Invalid or expired verification token" });
        }

        const verificationRecord = verificationRecords[0];
        console.log('✓ Verification record found for user_id:', verificationRecord.user_id);
        console.log('  Already verified:', verificationRecord.verified_at ? 'Yes' : 'No');
        console.log('  Expires at:', verificationRecord.expires_at);
        
        // Check if token is expired
        if (new Date() > new Date(verificationRecord.expires_at)) {
            console.log('✗ Token has expired');
            return res.status(400).json({ message: "Verification token has expired" });
        }

        // Check if already verified
        if (verificationRecord.verified_at) {
            console.log('✓ Email already verified');
            return res.status(200).json({ message: "Email already verified" });
        }
        
        // Update verification record
        const [updateVerificationResult] = await db.query(
            "UPDATE email_verifications SET verified_at = NOW() WHERE id = ?",
            [verificationRecord.id]
        ) as any[];
        console.log('✓ Verification record updated');

        // Update user's email_verified status
        const [updateUserResult] = await db.query(
            "UPDATE users SET email_verified = 1 WHERE id = ?",
            [verificationRecord.user_id]
        ) as any[];
        console.log('✓ User email_verified flag set to 1');
        console.log('Affected rows:', updateUserResult?.affectedRows);

        console.log('✓ Email verification completed successfully\n');
        res.status(200).json({ message: "Email verified successfully. You can now login." });
    } catch (error: any) {
        console.error("Verification error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/api/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        const [users] = await db.query(
            "SELECT * FROM users WHERE username = ? AND email_verified = 1",
            [username]
        ) as any[];

        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        if (user.email_verified !== 1) {
            return res.status(401).json({ message: "Please verify your email before logging in" });
        }

        // Exclude sensitive fields from response
        const { password_hash, ...userWithoutPassword } = user;

        res.status(200).json({
            message: "Login successful",
            user: userWithoutPassword
        });

    } catch (error: any) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Helper function to generate invite code
const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ==================== BILLS ENDPOINTS ====================

// Create a new bill
app.post("/api/bills", async (req: Request, res: Response) => {
    const { created_by, bill_name } = req.body;

    if (!created_by || !bill_name) {
        return res.status(400).json({ message: "Bill name and creator are required" });
    }

    try {
        const inviteCode = generateInviteCode();
        const [result] = await db.query(
            "INSERT INTO bills (created_by, bill_name, invite_code) VALUES (?, ?, ?)",
            [created_by, bill_name, inviteCode]
        ) as any[];

        const billId = result.insertId;

        // Add creator as involved person
        await db.query(
            "INSERT INTO involved_persons (bill_id, user_id) VALUES (?, ?)",
            [billId, created_by]
        );

        res.status(201).json({
            message: "Bill created successfully",
            bill: {
                id: billId,
                bill_name,
                invite_code: inviteCode,
                created_by,
                created_at: new Date()
            }
        });
    } catch (error: any) {
        console.error("Error creating bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all bills for a user (not archived)
app.get("/api/bills/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const [bills] = await db.query(`
            SELECT DISTINCT b.* FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE (b.created_by = ? OR ip.user_id = ?) AND b.archived_at IS NULL
            ORDER BY b.created_at DESC
        `, [userId, userId]) as any[];

        res.status(200).json({ bills });
    } catch (error: any) {
        console.error("Error fetching bills:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get archived bills for a user
app.get("/api/bills/:userId/archived", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const [bills] = await db.query(`
            SELECT DISTINCT b.* FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE (b.created_by = ? OR ip.user_id = ?) AND b.archived_at IS NOT NULL
            ORDER BY b.archived_at DESC
        `, [userId, userId]) as any[];

        res.status(200).json({ bills });
    } catch (error: any) {
        console.error("Error fetching archived bills:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get bill details with involved persons and expenses
app.get("/api/bills/:billId/details", async (req: Request, res: Response) => {
    const { billId } = req.params;

    try {
        const [bills] = await db.query("SELECT * FROM bills WHERE id = ?", [billId]) as any[];

        if (!bills.length) {
            return res.status(404).json({ message: "Bill not found" });
        }

        // Get involved persons
        const [involvedPersons] = await db.query(`
            SELECT ip.id, ip.user_id, ip.guest_user_id, u.nickname, u.first_name, u.last_name, u.email as user_email,
                   g.first_name as guest_first_name, g.last_name as guest_last_name, g.email as guest_email
            FROM involved_persons ip
            LEFT JOIN users u ON ip.user_id = u.id
            LEFT JOIN guest_users g ON ip.guest_user_id = g.id
            WHERE ip.bill_id = ?
        `, [billId]) as any[];

        // Get expenses
        const [expenses] = await db.query(`
            SELECT e.id, e.expense_name, e.total_amount, e.paid_by_user_id, e.paid_by_guest_id, e.created_at,
                   u.nickname, u.first_name, u.last_name,
                   g.first_name as guest_first_name, g.last_name as guest_last_name
            FROM expenses e
            LEFT JOIN users u ON e.paid_by_user_id = u.id
            LEFT JOIN guest_users g ON e.paid_by_guest_id = g.id
            WHERE e.bill_id = ?
            ORDER BY e.created_at DESC
        `, [billId]) as any[];

        res.status(200).json({
            bill: bills[0],
            involvedPersons,
            expenses
        });
    } catch (error: any) {
        console.error("Error fetching bill details:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update bill
app.put("/api/bills/:billId", async (req: Request, res: Response) => {
    const { billId } = req.params;
    const { bill_name } = req.body;

    try {
        await db.query("UPDATE bills SET bill_name = ? WHERE id = ?", [bill_name, billId]);
        res.status(200).json({ message: "Bill updated successfully" });
    } catch (error: any) {
        console.error("Error updating bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Archive a bill
app.put("/api/bills/:billId/archive", async (req: Request, res: Response) => {
    const { billId } = req.params;

    try {
        await db.query("UPDATE bills SET archived_at = NOW() WHERE id = ?", [billId]);
        res.status(200).json({ message: "Bill archived successfully" });
    } catch (error: any) {
        console.error("Error archiving bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete a bill
app.delete("/api/bills/:billId", async (req: Request, res: Response) => {
    const { billId } = req.params;

    try {
        // Delete related expenses first
        await db.query("DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE bill_id = ?)", [billId]);
        await db.query("DELETE FROM expenses WHERE bill_id = ?", [billId]);
        // Delete involved persons
        await db.query("DELETE FROM involved_persons WHERE bill_id = ?", [billId]);
        // Delete bill
        await db.query("DELETE FROM bills WHERE id = ?", [billId]);

        res.status(200).json({ message: "Bill deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Regenerate invite code
app.post("/api/bills/:billId/regenerate-code", async (req: Request, res: Response) => {
    const { billId } = req.params;

    try {
        const newCode = generateInviteCode();
        await db.query("UPDATE bills SET invite_code = ? WHERE id = ?", [newCode, billId]);
        res.status(200).json({ message: "Code regenerated", invite_code: newCode });
    } catch (error: any) {
        console.error("Error regenerating code:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==================== INVOLVED PERSONS ENDPOINTS ====================

// Add involved person (registered or guest)
app.post("/api/bills/:billId/involved-persons", async (req: Request, res: Response) => {
    const { billId } = req.params;
    const { user_id, guest_data } = req.body;

    try {
        let involvedPersonId;

        if (user_id) {
            // Add registered user
            const [result] = await db.query(
                "INSERT INTO involved_persons (bill_id, user_id) VALUES (?, ?)",
                [billId, user_id]
            ) as any[];
            involvedPersonId = result.insertId;
        } else if (guest_data) {
            // Add guest user
            const [guestResult] = await db.query(
                "INSERT INTO guest_users (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)",
                [guest_data.first_name, guest_data.last_name, guest_data.email, guest_data.phone || null]
            ) as any[];
            const guestUserId = guestResult.insertId;

            const [ipResult] = await db.query(
                "INSERT INTO involved_persons (bill_id, guest_user_id) VALUES (?, ?)",
                [billId, guestUserId]
            ) as any[];
            involvedPersonId = ipResult.insertId;
        }

        res.status(201).json({ message: "Person added successfully", involvedPersonId });
    } catch (error: any) {
        console.error("Error adding involved person:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Remove involved person
app.delete("/api/bills/:billId/involved-persons/:personId", async (req: Request, res: Response) => {
    const { billId, personId } = req.params;

    try {
        await db.query("DELETE FROM involved_persons WHERE id = ? AND bill_id = ?", [personId, billId]);
        res.status(200).json({ message: "Person removed successfully" });
    } catch (error: any) {
        console.error("Error removing involved person:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Search registered users
app.get("/api/users/search", async (req: Request, res: Response) => {
    const { query } = req.query;

    try {
        const [users] = await db.query(
            "SELECT id, nickname, first_name, last_name, email FROM users WHERE nickname LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? LIMIT 10",
            [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
        ) as any[];

        res.status(200).json({ users });
    } catch (error: any) {
        console.error("Error searching users:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==================== EXPENSES ENDPOINTS ====================

// Add expense to a bill
app.post("/api/bills/:billId/expenses", async (req: Request, res: Response) => {
    const { billId } = req.params;
    const { expense_name, total_amount, paid_by_user_id, paid_by_guest_id, splits } = req.body;

    if (!expense_name || !total_amount) {
        return res.status(400).json({ message: "Expense name and amount are required" });
    }

    try {
        const [expenseResult] = await db.query(
            "INSERT INTO expenses (bill_id, expense_name, total_amount, paid_by_user_id, paid_by_guest_id) VALUES (?, ?, ?, ?, ?)",
            [billId, expense_name, total_amount, paid_by_user_id || null, paid_by_guest_id || null]
        ) as any[];

        const expenseId = expenseResult.insertId;

        // Add expense splits
        if (splits && splits.length > 0) {
            for (const split of splits) {
                await db.query(
                    "INSERT INTO expense_splits (expense_id, user_id, guest_user_id, amount) VALUES (?, ?, ?, ?)",
                    [expenseId, split.user_id || null, split.guest_user_id || null, split.amount]
                );
            }
        }

        res.status(201).json({ message: "Expense added successfully", expenseId });
    } catch (error: any) {
        console.error("Error adding expense:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get expenses for a bill
app.get("/api/bills/:billId/expenses", async (req: Request, res: Response) => {
    const { billId } = req.params;

    try {
        const [expenses] = await db.query(`
            SELECT e.id, e.expense_name, e.total_amount, e.paid_by_user_id, e.paid_by_guest_id, e.created_at,
                   u.nickname, u.first_name, u.last_name,
                   g.first_name as guest_first_name, g.last_name as guest_last_name
            FROM expenses e
            LEFT JOIN users u ON e.paid_by_user_id = u.id
            LEFT JOIN guest_users g ON e.paid_by_guest_id = g.id
            WHERE e.bill_id = ?
            ORDER BY e.created_at DESC
        `, [billId]) as any[];

        // Get splits for each expense
        for (const expense of expenses) {
            const [splits] = await db.query(`
                SELECT es.id, es.user_id, es.guest_user_id, es.amount,
                       u.nickname, g.first_name, g.last_name
                FROM expense_splits es
                LEFT JOIN users u ON es.user_id = u.id
                LEFT JOIN guest_users g ON es.guest_user_id = g.id
                WHERE es.expense_id = ?
            `, [expense.id]) as any[];
            expense.splits = splits;
        }

        res.status(200).json({ expenses });
    } catch (error: any) {
        console.error("Error fetching expenses:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete expense
app.delete("/api/expenses/:expenseId", async (req: Request, res: Response) => {
    const { expenseId } = req.params;

    try {
        await db.query("DELETE FROM expense_splits WHERE expense_id = ?", [expenseId]);
        await db.query("DELETE FROM expenses WHERE id = ?", [expenseId]);
        res.status(200).json({ message: "Expense deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting expense:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});