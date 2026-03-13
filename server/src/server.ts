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
    const { created_by, bill_name, invite_code, involved_persons } = req.body;

    if (!created_by || !bill_name) {
        return res.status(400).json({ message: "Bill name and creator are required" });
    }

    try {
        const finalInviteCode = invite_code || generateInviteCode();
        const [result] = await db.query(
            "INSERT INTO bills (created_by, bill_name, invite_code) VALUES (?, ?, ?)",
            [created_by, bill_name, finalInviteCode]
        ) as any[];

        const billId = result.insertId;

        // Process involved persons
        if (involved_persons && Array.isArray(involved_persons)) {
            for (const person of involved_persons) {
                if (person.is_guest) {
                    // Create guest user
                    const [guestResult] = await db.query(
                        "INSERT INTO guest_users (first_name, last_name, nickname, email) VALUES (?, ?, ?, ?)",
                        [person.first_name, person.last_name, person.nickname, person.email]
                    ) as any[];
                    const guestId = guestResult.insertId;
                    
                    await db.query(
                        "INSERT INTO involved_persons (bill_id, guest_user_id) VALUES (?, ?)",
                        [billId, guestId]
                    );
                } else {
                    // Registered user
                    await db.query(
                        "INSERT INTO involved_persons (bill_id, user_id) VALUES (?, ?)",
                        [billId, person.user_id || person.id]
                    );
                }
            }
        } else {
            // Default: add creator as involved person if no list provided
            await db.query(
                "INSERT INTO involved_persons (bill_id, user_id) VALUES (?, ?)",
                [billId, created_by]
            );
        }

        res.status(201).json({
            message: "Bill created successfully",
            bill: {
                id: billId,
                bill_name,
                invite_code: finalInviteCode,
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
        const [ipRaw] = await db.query(`
            SELECT ip.id as record_id, ip.user_id, ip.guest_user_id, 
                   u.nickname as user_nickname, u.first_name as user_first, u.last_name as user_last, u.email as user_email,
                   g.nickname as guest_nickname, g.first_name as guest_first, g.last_name as guest_last, g.email as guest_email
            FROM involved_persons ip
            LEFT JOIN users u ON ip.user_id = u.id
            LEFT JOIN guest_users g ON ip.guest_user_id = g.id
            WHERE ip.bill_id = ?
        `, [billId]) as any[];

        const involvedPersons = ipRaw.map((row: any) => ({
            id: row.user_id || row.guest_user_id,
            nickname: row.user_nickname || row.guest_nickname,
            first_name: row.user_first || row.guest_first,
            last_name: row.user_last || row.guest_last,
            email: row.user_email || row.guest_email,
            is_guest: !!row.guest_user_id,
            user_id: row.user_id
        }));

        // Get expenses
        const [expensesRaw] = await db.query(`
            SELECT e.* FROM expenses e
            WHERE e.bill_id = ?
            ORDER BY e.created_at DESC
        `, [billId]) as any[];

        const expenses = await Promise.all(expensesRaw.map(async (e: any) => {
            const [splits] = await db.query(
                "SELECT user_id, guest_user_id FROM expense_splits WHERE expense_id = ?",
                [e.id]
            ) as any[];

            return {
                id: e.id,
                bill_id: e.bill_id,
                expense_name: e.expense_name,
                total_amount: parseFloat(e.total_amount),
                paid_by_id: e.paid_by_user_id || e.paid_by_guest_id,
                split_type: e.split_type,
                involved_person_ids: splits.map((s: any) => s.user_id || s.guest_user_id),
                created_at: e.created_at
            };
        }));

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

// Restore a bill
app.put("/api/bills/:billId/restore", async (req: Request, res: Response) => {
    const { billId } = req.params;

    try {
        await db.query("UPDATE bills SET archived_at = NULL WHERE id = ?", [billId]);
        res.status(200).json({ message: "Bill restored successfully" });
    } catch (error: any) {
        console.error("Error restoring bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});
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
    const { q } = req.query;

    try {
        const [users] = await db.query(
            "SELECT id, nickname, username, first_name, last_name, email FROM users WHERE nickname LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? LIMIT 10",
            [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
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
    const { expense_name, total_amount, paid_by_id, split_type, involved_person_ids } = req.body;

    if (!expense_name || !total_amount || !paid_by_id) {
        return res.status(400).json({ message: "Expense name, amount, and payer are required" });
    }

    try {
        const isGuestPayer = typeof paid_by_id === 'string' && paid_by_id.startsWith('guest_');
        const payerIdValue = isGuestPayer ? null : paid_by_id;
        
        // Find the guest actual ID if it's a guest
        let guestPayerId = null;
        if (isGuestPayer) {
            const [guestLookup] = await db.query(
                "SELECT guest_user_id FROM involved_persons WHERE guest_user_id IS NOT NULL AND bill_id = ?",
                [billId]
            ) as any[];
            // In a real app, we'd match the specific guest. Here we find the one that corresponds to the bill.
            // But the frontend sends the guest_user.id if it's already in DB.
            // Wait, if it's a new bill being created, they are temp IDs.
            // If viewing an existing bill, they are DB IDs.
            guestPayerId = paid_by_id; 
        }

        // Simplification: In the details fetch, we'll return the DB IDs.
        // Let's assume paid_by_id is the DB ID of the user or guest_user.
        
        const isUserPayer = !isNaN(Number(paid_by_id));
        const finalUserId = isUserPayer ? paid_by_id : null;
        const finalGuestId = !isUserPayer ? paid_by_id : null;

        const [expenseResult] = await db.query(
            "INSERT INTO expenses (bill_id, expense_name, total_amount, paid_by_user_id, paid_by_guest_id, split_type) VALUES (?, ?, ?, ?, ?, ?)",
            [billId, expense_name, total_amount, finalUserId, finalGuestId, split_type]
        ) as any[];

        const expenseId = expenseResult.insertId;

        // Add splits
        if (involved_person_ids && involved_person_ids.length > 0) {
            const splitAmount = total_amount / involved_person_ids.length;
            for (const pid of involved_person_ids) {
                const isUser = !isNaN(Number(pid));
                await db.query(
                    "INSERT INTO expense_splits (expense_id, user_id, guest_user_id, amount) VALUES (?, ?, ?, ?)",
                    [expenseId, isUser ? pid : null, !isUser ? pid : null, splitAmount]
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

// ==================== DASHBOARD ENDPOINTS ====================

app.get("/api/dashboard/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        // 1. Calculate stats
        // Owed to you: amount from splits where I paid but others are involved
        const [owedToYouResult] = await db.query(`
            SELECT SUM(es.amount) as total
            FROM expense_splits es
            JOIN expenses e ON es.expense_id = e.id
            WHERE e.paid_by_user_id = ? AND (es.user_id != ? OR es.user_id IS NULL)
        `, [userId, userId]) as any[];

        // You owe: amount from splits where others paid but I am involved
        const [youOweResult] = await db.query(`
            SELECT SUM(es.amount) as total
            FROM expense_splits es
            JOIN expenses e ON es.expense_id = e.id
            WHERE (e.paid_by_user_id != ? OR e.paid_by_user_id IS NULL) AND es.user_id = ?
        `, [userId, userId]) as any[];

        // Active groups/bills
        const [activeBillsResult] = await db.query(`
            SELECT COUNT(DISTINCT b.id) as count
            FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE (b.created_by = ? OR ip.user_id = ?) AND b.archived_at IS NULL
        `, [userId, userId]) as any[];

        // 2. Recent Activity
        const [recentActivity] = await db.query(`
            SELECT DISTINCT e.*, b.bill_name,
                   CASE 
                     WHEN e.paid_by_user_id = ? THEN 'lent' 
                     ELSE 'owe' 
                   END as type
            FROM expenses e
            JOIN bills b ON e.bill_id = b.id
            LEFT JOIN expense_splits es ON e.id = es.expense_id
            WHERE e.paid_by_user_id = ? OR es.user_id = ?
            ORDER BY e.created_at DESC
            LIMIT 5
        `, [userId, userId, userId]) as any[];

        res.status(200).json({
            stats: {
                owed_to_you: parseFloat(owedToYouResult[0]?.total || 0),
                you_owe: parseFloat(youOweResult[0]?.total || 0),
                active_bills: activeBillsResult[0]?.count || 0
            },
            recentActivity: recentActivity.map((item: any) => ({
                id: item.id,
                title: item.expense_name,
                amount: `₱${parseFloat(item.total_amount).toLocaleString()}`,
                status: 'Pending', // Simplified for now
                type: item.type,
                date: new Date(item.created_at).toLocaleDateString()
            }))
        });
    } catch (error: any) {
        console.error("Error fetching dashboard data:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==================== ACTIVITY ENDPOINTS ====================

app.get("/api/activity/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const [activities] = await db.query(`
            SELECT DISTINCT e.*, b.bill_name,
                   CASE 
                     WHEN e.paid_by_user_id = ? THEN 'lent' 
                     ELSE 'owe' 
                   END as type
            FROM expenses e
            JOIN bills b ON e.bill_id = b.id
            LEFT JOIN expense_splits es ON e.id = es.expense_id
            WHERE e.paid_by_user_id = ? OR es.user_id = ?
            ORDER BY e.created_at DESC
        `, [userId, userId, userId]) as any[];

        res.status(200).json({
            activities: activities.map((item: any) => ({
                id: item.id,
                title: item.expense_name,
                amount: `₱${parseFloat(item.total_amount).toLocaleString()}`,
                status: 'Pending', // Simplified for now
                type: item.type,
                date: new Date(item.created_at).toLocaleDateString()
            }))
        });
    } catch (error: any) {
        console.error("Error fetching activity data:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==================== GROUPS ENDPOINTS ====================

app.get("/api/groups/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        // Fetch bills where the user is involved
        const [bills] = await db.query(`
            SELECT DISTINCT b.* 
            FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE b.created_by = ? OR ip.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId, userId]) as any[];

        const groups = await Promise.all(bills.map(async (bill: any) => {
            // Get member count
            const [members] = await db.query(
                "SELECT COUNT(*) as count FROM involved_persons WHERE bill_id = ?",
                [bill.id]
            ) as any[];

            // Calculate user's balance in this group
            // 1. Amount user paid but split with others (lent)
            const [lentResult] = await db.query(`
                SELECT SUM(es.amount) as total
                FROM expense_splits es
                JOIN expenses e ON es.expense_id = e.id
                WHERE e.bill_id = ? AND e.paid_by_user_id = ? AND (es.user_id != ? OR es.user_id IS NULL)
            `, [bill.id, userId, userId]) as any[];

            // 2. Amount others paid but user is involved (owe)
            const [oweResult] = await db.query(`
                SELECT SUM(es.amount) as total
                FROM expense_splits es
                JOIN expenses e ON es.expense_id = e.id
                WHERE e.bill_id = ? AND (e.paid_by_user_id != ? OR e.paid_by_user_id IS NULL) AND es.user_id = ?
            `, [bill.id, userId, userId]) as any[];

            const lent = parseFloat(lentResult[0]?.total || 0);
            const owe = parseFloat(oweResult[0]?.total || 0);
            const netBalance = lent - owe;

            let balanceText = "Settled up";
            if (netBalance > 0) balanceText = `₱${netBalance.toLocaleString()} to collect`;
            if (netBalance < 0) balanceText = `₱${Math.abs(netBalance).toLocaleString()} owed`;

            return {
                id: bill.id,
                name: bill.bill_name,
                members: members[0].count,
                balance: balanceText,
                netBalance: netBalance
            };
        }));

        res.status(200).json({ groups });
    } catch (error: any) {
        console.error("Error fetching groups:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==================== PASSWORD RESET ENDPOINTS ====================

app.post("/api/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const [users] = await db.query("SELECT id, first_name FROM users WHERE email = ?", [email]) as any[];

        if (users.length === 0) {
            // Return 200 even if user doesn't exist for security
            return res.status(200).json({ message: "If an account exists, a reset link has been sent." });
        }

        const user = users[0];
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration

        await db.query(
            "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
            [user.id, token, expiresAt]
        );

        const resetLink = `http://localhost:5174/reset-password?token=${token}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Request - BillSplit",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
                    <p>Hi ${user.first_name},</p>
                    <p>We received a request to reset your password. Click the button below to set a new one:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">This link will expire in 1 hour.</p>
                    <p style="color: #64748b; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">BillSplit &copy; 2026</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Reset link sent successfully" });

    } catch (error: any) {
        console.error("Forgot password error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/api/reset-password", async (req: Request, res: Response) => {
    const { token, password } = req.body;

    try {
        const [resets] = await db.query(
            "SELECT user_id FROM password_resets WHERE token = ? AND expires_at > NOW()",
            [token]
        ) as any[];

        if (resets.length === 0) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        const userId = resets[0].user_id;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password
        await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, userId]);

        // Delete used token
        await db.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);

        res.status(200).json({ message: "Password updated successfully" });

    } catch (error: any) {
        console.error("Reset password error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});