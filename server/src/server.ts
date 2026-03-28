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
        const clientUrl = req.headers.origin || 'http://localhost:8111';
        const verificationLink = `${clientUrl}/verify?token=${encodeURIComponent(verificationToken)}`;
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
        console.log('\n=== EMAIL VERIFICATION REQUEST ===');
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

// Helper function to enrich bills with expenses and involved persons data
async function enrichBills(billsToEnrich: any[]) {
    return Promise.all(billsToEnrich.map(async (b) => {
        const [[{ cnt }]] = await db.query("SELECT COUNT(*) as cnt FROM expenses WHERE bill_id = ?", [b.id]) as any[];

        const [recent] = await db.query("SELECT expense_name as name, total_amount as amount FROM expenses WHERE bill_id = ? ORDER BY created_at DESC LIMIT 2", [b.id]) as any[];

        const [inv] = await db.query(`
            SELECT COALESCE(u.nickname, u.first_name, g.nickname, g.first_name) as name 
            FROM involved_persons ip 
            LEFT JOIN users u ON ip.user_id = u.id 
            LEFT JOIN guest_users g ON ip.guest_user_id = g.id 
            WHERE ip.bill_id = ?
        `, [b.id]) as any[];

        return {
            ...b,
            expense_count: cnt,
            recent_expenses: JSON.stringify(recent),
            involved_names: JSON.stringify(inv.map((i: any) => i.name))
        };
    }));
}

// Create a new bill
app.post("/api/bills", async (req: Request, res: Response) => {
    const { created_by, bill_name, invite_code, involved_persons } = req.body;

    if (!created_by || !bill_name) {
        return res.status(400).json({ message: "Bill name and creator are required" });
    }

    try {
        // Enforce Standard User Limits
        const [users] = await db.query("SELECT user_type_id FROM users WHERE id = ?", [created_by]) as any[];
        if (users.length && users[0].user_type_id === 1) { // Standard User
            // Check person limit
            const memberCount = (involved_persons ? involved_persons.length : 0);
            if (memberCount > 3) {
                return res.status(403).json({ message: "Standard users can add a maximum of 3 members per bill." });
            }

            // Check monthly bill limit
            const startDate = new Date();
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);

            const [billCount] = await db.query(
                "SELECT COUNT(*) as count FROM bills WHERE created_by = ? AND created_at >= ?",
                [created_by, startDate]
            ) as any[];

            if (billCount[0].count >= 5) {
                return res.status(403).json({ message: "Standard users can create a maximum of 5 bills per month." });
            }
        }

        const finalInviteCode = invite_code || generateInviteCode();
        const shareToken = crypto.randomUUID();

        const [result] = await db.query(
            "INSERT INTO bills (created_by, bill_name, invite_code, share_token) VALUES (?, ?, ?, ?)",
            [created_by, bill_name, finalInviteCode, shareToken]
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

        const enrichedBills = await enrichBills(bills);
        res.status(200).json({ bills: enrichedBills });
    } catch (error: any) {
        console.error("Error fetching bills:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all bills for a guest user
app.get("/api/guests/:guestId/bills", async (req: Request, res: Response) => {
    const { guestId } = req.params;

    try {
        const [bills] = await db.query(`
            SELECT DISTINCT b.* FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE ip.guest_user_id = ? AND b.archived_at IS NULL
            ORDER BY b.created_at DESC
        `, [guestId]) as any[];

        const enrichedBills = await enrichBills(bills);
        res.status(200).json({ bills: enrichedBills });
    } catch (error: any) {
        console.error("Error fetching guest bills:", error.message);
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

        const enrichedBills = await enrichBills(bills);
        res.status(200).json({ bills: enrichedBills });
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
            return res.status(404).json({ message: "Bill found" });
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
            id: row.guest_user_id ? `guest_${row.guest_user_id}` : row.user_id,
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
                "SELECT user_id, guest_user_id, amount FROM expense_splits WHERE expense_id = ?",
                [e.id]
            ) as any[];

            return {
                id: e.id,
                bill_id: e.bill_id,
                expense_name: e.expense_name,
                total_amount: parseFloat(e.total_amount),
                paid_by_id: e.paid_by_guest_id ? `guest_${e.paid_by_guest_id}` : e.paid_by_user_id,
                split_type: e.split_type,
                splits: splits.map((s: any) => ({
                    user_id: s.user_id,
                    guest_user_id: s.guest_user_id,
                    amount: parseFloat(s.amount)
                })),
                involved_person_ids: splits.map((s: any) => s.guest_user_id ? `guest_${s.guest_user_id}` : s.user_id),
                created_at: e.created_at
            };
        }));

        // Get settlements
        const [settlementsRaw] = await db.query(`
            SELECT s.* FROM settlements s
            WHERE s.bill_id = ?
            ORDER BY s.created_at DESC
        `, [billId]) as any[];

        const settlements = settlementsRaw.map((s: any) => ({
            id: s.id,
            bill_id: s.bill_id,
            paid_by_id: s.paid_by_guest_id ? `guest_${s.paid_by_guest_id}` : s.paid_by_user_id,
            paid_to_id: s.paid_to_guest_id ? `guest_${s.paid_to_guest_id}` : s.paid_to_user_id,
            amount: parseFloat(s.amount),
            created_at: s.created_at
        }));

        res.status(200).json({
            bill: bills[0],
            involvedPersons,
            expenses,
            settlements
        });
    } catch (error: any) {
        console.error("Error fetching bill details:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get bill by token (for invite links)
app.get("/api/bills/token/:token", async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
        const [bills] = await db.query("SELECT id, bill_name FROM bills WHERE share_token = ?", [token]) as any[];

        if (bills.length === 0) {
            return res.status(404).json({ message: "Invalid or expired invite link" });
        }

        res.status(200).json({ bill: bills[0] });
    } catch (error: any) {
        console.error("Error fetching bill by token:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Add person to a bill (Registered or Guest)
app.post("/api/bills/:billId/involved-persons", async (req: Request, res: Response) => {
    const { billId } = req.params;
    const { user_id, guest_user_id, guest_data, created_by } = req.body;

    try {
        let finalUserId = user_id || null;
        let finalGuestId = guest_user_id || null;

        // If manual guest data is provided, determine if it's a new or existing guest
        if (guest_data) {
            const { first_name, last_name, nickname, email } = guest_data;

            // Check if email belongs to a registered user first
            const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]) as any[];
            if (users.length > 0) {
                finalUserId = users[0].id;
                finalGuestId = null;
            } else {
                // Check if email belongs to an existing guest user
                const [existingGuests] = await db.query("SELECT id FROM guest_users WHERE email = ?", [email]) as any[];
                if (existingGuests.length > 0) {
                    finalGuestId = existingGuests[0].id;
                    // Update existing guest nickname if provided
                    if (nickname) {
                        await db.query("UPDATE guest_users SET nickname = ? WHERE id = ?", [nickname, finalGuestId]);
                    }
                } else {
                    // Create New Guest User
                    const [guestResult] = await db.query(
                        "INSERT INTO guest_users (first_name, last_name, nickname, email) VALUES (?, ?, ?, ?)",
                        [first_name, last_name, nickname, email]
                    ) as any[];
                    finalGuestId = guestResult.insertId;
                }
            }
        }

        // Check if already in bill to avoid duplicates
        const [existing] = await db.query(
            "SELECT id FROM involved_persons WHERE bill_id = ? AND (user_id <=> ? AND guest_user_id <=> ?)",
            [billId, finalUserId, finalGuestId]
        ) as any[];

        if (existing.length > 0) {
            return res.status(400).json({ message: "This person is already added to the bill." });
        }

        await db.query(
            "INSERT INTO involved_persons (bill_id, user_id, guest_user_id) VALUES (?, ?, ?)",
            [billId, finalUserId, finalGuestId]
        );

        res.status(201).json({ message: "Person added to bill successfully" });
    } catch (error: any) {
        console.error("Error adding person to bill:", error.message);
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

// Record a settlement (Payment)
app.post("/api/bills/:billId/settlements", async (req: Request, res: Response) => {
    const { billId } = req.params;
    const { paid_by_id, paid_to_id, amount } = req.body;

    try {
        const isPaidByGuest = typeof paid_by_id === 'string' && paid_by_id.startsWith('guest_');
        const paidByUserId = isPaidByGuest ? null : paid_by_id;
        const paidByGuestId = isPaidByGuest ? parseInt(paid_by_id.replace('guest_', '')) : null;

        const isPaidToGuest = typeof paid_to_id === 'string' && paid_to_id.startsWith('guest_');
        const paidToUserId = isPaidToGuest ? null : paid_to_id;
        const paidToGuestId = isPaidToGuest ? parseInt(paid_to_id.replace('guest_', '')) : null;

        await db.query(
            "INSERT INTO settlements (bill_id, paid_by_user_id, paid_by_guest_id, paid_to_user_id, paid_to_guest_id, amount) VALUES (?, ?, ?, ?, ?, ?)",
            [billId, paidByUserId, paidByGuestId, paidToUserId, paidToGuestId, amount]
        );

        res.status(201).json({ message: "Payment recorded successfully" });
    } catch (error: any) {
        console.error("Error recording settlement:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Edit an expense
app.put("/api/expenses/:expenseId", async (req: Request, res: Response) => {
    const { expenseId } = req.params;
    const { expense_name, total_amount, paid_by, split_type, split_with } = req.body;

    try {
        const isGuest = typeof paid_by === 'string' && paid_by.startsWith('guest_');
        const paidByUserId = isGuest ? null : paid_by;
        const paidByGuestId = isGuest ? parseInt(paid_by.replace('guest_', '')) : null;

        await db.query(
            "UPDATE expenses SET expense_name = ?, total_amount = ?, paid_by_user_id = ?, paid_by_guest_id = ?, split_type = ? WHERE id = ?",
            [expense_name, total_amount, paidByUserId, paidByGuestId, split_type, expenseId]
        );

        // Delete old splits
        await db.query("DELETE FROM expense_splits WHERE expense_id = ?", [expenseId]);

        // Re-insert new splits
        const splitAmount = split_type === 'equally' ? total_amount / split_with.length : 0;

        for (const personId of split_with) {
            const isGuestSplit = typeof personId === 'string' && personId.startsWith('guest_');
            const splitUserId = isGuestSplit ? null : personId;
            const splitGuestId = isGuestSplit ? parseInt(personId.replace('guest_', '')) : null;

            await db.query(
                "INSERT INTO expense_splits (expense_id, user_id, guest_user_id, amount) VALUES (?, ?, ?, ?)",
                [expenseId, splitUserId, splitGuestId, splitAmount]
            );
        }

        res.status(200).json({ message: "Expense updated successfully" });
    } catch (error: any) {
        console.error("Error updating expense:", error.message);
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
    const { user_id, guest_data, created_by } = req.body; // Add created_by

    try {
        // Enforce limits if added by a standard user
        if (created_by) {
            const [users] = await db.query("SELECT user_type_id FROM users WHERE id = ?", [created_by]) as any[];
            if (users.length && users[0].user_type_id === 1) { // Standard User
                const [members] = await db.query("SELECT COUNT(*) as count FROM involved_persons WHERE bill_id = ?", [billId]) as any[];
                if (members[0].count >= 3) {
                    return res.status(403).json({ message: "Standard users can add a maximum of 3 members per bill." });
                }
            }
        }

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
    const { billId } = req.params;
    const personId = req.params.personId as string;

    try {
        const isGuest = personId.startsWith('guest_');
        const finalUserId = isGuest ? null : personId;
        const finalGuestId = isGuest ? parseInt(personId.replace('guest_', '')) : null;

        if (isGuest) {
            await db.query("DELETE FROM involved_persons WHERE guest_user_id = ? AND bill_id = ?", [finalGuestId, billId]);
        } else {
            await db.query("DELETE FROM involved_persons WHERE user_id = ? AND bill_id = ?", [finalUserId, billId]);
        }
        res.status(200).json({ message: "Person removed successfully" });
    } catch (error: any) {
        console.error("Error removing involved person:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Validate Invite Code
app.get("/api/bills/invite/:code", async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
        return res.status(400).json({ message: "Invite code is required" });
    }

    try {
        const [bills] = await db.query("SELECT id, share_token FROM bills WHERE invite_code = ?", [code]) as any[];

        if (bills.length === 0) {
            return res.status(404).json({ message: "Invalid invite code" });
        }

        res.status(200).json({ valid: true, billId: bills[0].id, share_token: bills[0].share_token });
    } catch (error: any) {
        console.error("Invite code validation error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Guest Join Route via Invite Code OR Token
app.post("/api/bills/join", async (req: Request, res: Response) => {
    const { invite_code, share_token, first_name, last_name, email, nickname } = req.body;

    if ((!invite_code && !share_token) || !first_name || !last_name || !email || !nickname) {
        return res.status(400).json({ message: "Identifier (code or token) and user details are required" });
    }

    try {
        let bills: any[] = [];
        if (share_token) {
            [bills] = await db.query("SELECT id, created_by FROM bills WHERE share_token = ?", [share_token]) as any[];
        } else {
            [bills] = await db.query("SELECT id, created_by FROM bills WHERE invite_code = ?", [invite_code]) as any[];
        }

        if (bills.length === 0) {
            return res.status(404).json({ message: "Invalid invite code" });
        }

        const bill = bills[0];

        // Check user type of bill creator to enforce standard limits
        const [creators] = await db.query("SELECT user_type_id FROM users WHERE id = ?", [bill.created_by]) as any[];
        if (creators.length && creators[0].user_type_id === 1) {
            const [members] = await db.query("SELECT COUNT(*) as count FROM involved_persons WHERE bill_id = ?", [bill.id]) as any[];
            if (members[0].count >= 3) {
                return res.status(403).json({ message: "This bill has reached the maximum number of members allowed for a Standard user." });
            }
        }

        // Check if email belongs to a registered user
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]) as any[];

        let guestUserId = null;
        let registeredUserId = null;
        let isRegistered = false;

        if (users.length > 0) {
            // It's a registered user. Add them directly as a user.
            registeredUserId = users[0].id;
            isRegistered = true;

            // Check if already in bill
            const [existingIP] = await db.query(
                "SELECT id FROM involved_persons WHERE bill_id = ? AND user_id = ?",
                [bill.id, registeredUserId]
            ) as any[];

            if (existingIP.length === 0) {
                await db.query(
                    "INSERT INTO involved_persons (bill_id, user_id) VALUES (?, ?)",
                    [bill.id, registeredUserId]
                );
            }
        } else {
            // Check if email belongs to an existing guest user
            const [existingGuests] = await db.query("SELECT * FROM guest_users WHERE email = ?", [email]) as any[];

            if (existingGuests.length > 0) {
                guestUserId = existingGuests[0].id;

                // Ensure they are attached to the bill
                const [existingIP] = await db.query(
                    "SELECT id FROM involved_persons WHERE bill_id = ? AND guest_user_id = ?",
                    [bill.id, guestUserId]
                ) as any[];

                if (existingIP.length === 0) {
                    await db.query(
                        "INSERT INTO involved_persons (bill_id, guest_user_id) VALUES (?, ?)",
                        [bill.id, guestUserId]
                    );
                }
            } else {
                // Create New Guest User
                const [guestResult] = await db.query(
                    "INSERT INTO guest_users (first_name, last_name, nickname, email) VALUES (?, ?, ?, ?)",
                    [first_name, last_name, nickname, email]
                ) as any[];
                guestUserId = guestResult.insertId;

                await db.query(
                    "INSERT INTO involved_persons (bill_id, guest_user_id) VALUES (?, ?)",
                    [bill.id, guestUserId]
                );
            }
        }

        if (isRegistered) {
            // If they are a registered user, they just joined via email check.
            // But they might not be authenticated right now on the client.
            // We tell the client it was successful, but they still need to login to see it unless they are already logged in.
            return res.status(200).json({
                message: "You have been added to the bill! Please log in to view changes.",
                isRegistered: true,
                requiresLogin: true,
                billId: bill.id
            });
        }

        res.status(200).json({
            message: "Joined successfully as guest",
            guestUser: {
                id: guestUserId,
                first_name,
                last_name,
                nickname,
                email,
                is_guest: true
            },
            billId: bill.id
        });

    } catch (error: any) {
        console.error("Guest join error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get bills for a guest
app.get("/api/guests/:guestId/bills", async (req: Request, res: Response) => {
    const { guestId } = req.params;

    try {
        const query = `
            SELECT b.*, u.username as creator_name,
            (SELECT SUM(amount) FROM expenses WHERE bill_id = b.id) as total_amount,
            (SELECT COUNT(*) FROM involved_persons WHERE bill_id = b.id) as members_count
            FROM bills b
            JOIN users u ON b.created_by = u.id
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE ip.guest_user_id = ?
            ORDER BY b.created_at DESC
        `;

        const [bills] = await db.query(query, [guestId]) as any[];
        res.status(200).json({ bills });
    } catch (error: any) {
        console.error("Fetch guest bills error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Remove person from a bill
app.delete("/api/bills/:billId/persons/:personId", async (req: Request, res: Response) => {
    const { billId, personId } = req.params;

    try {
        const isGuest = typeof personId === 'string' && personId.startsWith('guest_');
        const userId = isGuest ? null : personId;
        const guestId = isGuest ? parseInt(personId.replace('guest_', '')) : null;

        // Verify they aren't the creator of the bill
        const [bills] = await db.query("SELECT created_by FROM bills WHERE id = ?", [billId]) as any[];
        if (bills.length > 0 && bills[0].created_by == userId) {
            return res.status(400).json({ message: "Cannot remove the host of the bill." });
        }

        // Safety check: Do they have any expenses where they paid?
        const [paidExpenses] = await db.query(
            "SELECT id FROM expenses WHERE bill_id = ? AND (paid_by_user_id = ? OR paid_by_guest_id = ?)",
            [billId, userId, guestId]
        ) as any[];

        if (paidExpenses.length > 0) {
            return res.status(400).json({ message: "Cannot remove this person because they have paid for expenses in this bill." });
        }

        // Safety check: Are they involved in any expense splits?
        const [splitExpenses] = await db.query(
            "SELECT es.id FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.bill_id = ? AND (es.user_id = ? OR es.guest_user_id = ?)",
            [billId, userId, guestId]
        ) as any[];

        if (splitExpenses.length > 0) {
            return res.status(400).json({ message: "Cannot remove this person because they are involved in splitting an expense." });
        }

        // Safety check: Are they involved in any settlements?
        const [settlements] = await db.query(
            "SELECT id FROM settlements WHERE bill_id = ? AND (paid_by_user_id = ? OR paid_by_guest_id = ? OR paid_to_user_id = ? OR paid_to_guest_id = ?)",
            [billId, userId, guestId, userId, guestId]
        ) as any[];

        if (settlements.length > 0) {
            return res.status(400).json({ message: "Cannot remove this person because they have recorded payment settlements in this bill." });
        }

        // Safe to delete
        if (isGuest) {
            await db.query("DELETE FROM involved_persons WHERE bill_id = ? AND guest_user_id = ?", [billId, guestId]);
        } else {
            await db.query("DELETE FROM involved_persons WHERE bill_id = ? AND user_id = ?", [billId, userId]);
        }

        res.status(200).json({ message: "Person removed successfully." });

    } catch (error: any) {
        console.error("Remove person error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Upgrade Guest to Registered User
app.post("/api/users/upgrade-guest", async (req: Request, res: Response) => {
    const { guest_id, first_name, last_name, email, username, password } = req.body;

    if (!guest_id || !first_name || !last_name || !email || !username || !password) {
        return res.status(400).json({ message: "All fields are required to upgrade your account" });
    }

    try {
        // Double check guest exists
        const [guests] = await db.query("SELECT * FROM guest_users WHERE id = ?", [guest_id]) as any[];

        if (guests.length === 0) {
            return res.status(404).json({ message: "Guest session expired or not found" });
        }

        // Check if username already exists
        const [existingUsernames] = await db.query("SELECT id FROM users WHERE username = ?", [username]) as any[];
        if (existingUsernames.length > 0) {
            return res.status(400).json({ message: "Username is already taken" });
        }

        // Check if email already registered just in case
        const [existingEmails] = await db.query("SELECT id FROM users WHERE email = ?", [email]) as any[];
        if (existingEmails.length > 0) {
            return res.status(400).json({ message: "Email is already registered. Please log in." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the user. The guest's First Name will be used as a default Nickname
        const [userResult] = await db.query(
            "INSERT INTO users (first_name, last_name, nickname, email, username, password_hash, email_verified, user_type_id) VALUES (?, ?, ?, ?, ?, ?, 1, 1)",
            [first_name, last_name, first_name, email, username, hashedPassword]
        ) as any[];

        const newUserId = userResult.insertId;

        // Transfer records from guest_user_id to user_id
        await db.query("UPDATE involved_persons SET user_id = ?, guest_user_id = NULL WHERE guest_user_id = ?", [newUserId, guest_id]);
        await db.query("UPDATE expenses SET paid_by_user_id = ?, paid_by_guest_id = NULL WHERE paid_by_guest_id = ?", [newUserId, guest_id]);
        await db.query("UPDATE expense_splits SET user_id = ?, guest_user_id = NULL WHERE guest_user_id = ?", [newUserId, guest_id]);

        // Clean up guest record
        await db.query("DELETE FROM guest_users WHERE id = ?", [guest_id]);

        // Fetch upgraded user to return
        const [newUsers] = await db.query("SELECT * FROM users WHERE id = ?", [newUserId]) as any[];
        const upgradedUser = newUsers[0];
        const { password_hash, ...userWithoutPassword } = upgradedUser;

        res.status(200).json({
            message: "Account upgraded successfully",
            user: userWithoutPassword
        });

    } catch (error: any) {
        console.error("Guest upgrade error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Search registered and guest users
app.get("/api/users/search", async (req: Request, res: Response) => {
    const { q } = req.query;

    try {
        const query = `%${q}%`;
        const [users] = await db.query(`
            SELECT id, COALESCE(nickname, first_name) as nickname, username, first_name, last_name, email, 0 as is_guest 
            FROM users 
            WHERE nickname LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
            UNION ALL
            SELECT id, COALESCE(nickname, first_name) as nickname, NULL as username, first_name, last_name, email, 1 as is_guest 
            FROM guest_users 
            WHERE nickname LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
            LIMIT 10
        `, [query, query, query, query, query, query, query, query, query]) as any[];

        res.status(200).json({ users });
    } catch (error: any) {
        console.error("Error searching users:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update user profile
app.put("/api/users/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { first_name, last_name, nickname, email, username } = req.body;

    if (!first_name || !last_name || !nickname || !email || !username) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Check if new email or username is already taken by another user
        const [existingUsers] = await db.query(
            "SELECT email, username FROM users WHERE (email = ? OR username = ?) AND id != ?",
            [email, username, userId]
        ) as any[];

        if (existingUsers.length > 0) {
            const conflict = existingUsers[0];
            if (conflict.email === email) return res.status(400).json({ message: "Email already in use" });
            if (conflict.username === username) return res.status(400).json({ message: "Username already taken" });
        }

        await db.query(
            "UPDATE users SET first_name = ?, last_name = ?, nickname = ?, email = ?, username = ? WHERE id = ?",
            [first_name, last_name, nickname, email, username, userId]
        );

        // Fetch updated user
        const [users] = await db.query("SELECT * FROM users WHERE id = ?", [userId]) as any[];

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const { password_hash, ...userWithoutPassword } = users[0];
        res.status(200).json({ message: "Profile updated successfully", user: userWithoutPassword });
    } catch (error: any) {
        console.error("Error updating user profile:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Upgrade user to Premium
app.put("/api/users/:userId/upgrade-premium", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        await db.query("UPDATE users SET user_type_id = 2 WHERE id = ?", [userId]);

        const [users] = await db.query("SELECT * FROM users WHERE id = ?", [userId]) as any[];

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const { password_hash, ...userWithoutPassword } = users[0];
        res.status(200).json({ message: "Upgraded to Premium successfully!", user: userWithoutPassword });
    } catch (error: any) {
        console.error("Error upgrading user to premium:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Change user password
app.put("/api/users/:userId/password", async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
    }

    try {
        const [users] = await db.query("SELECT * FROM users WHERE id = ?", [userId]) as any[];
        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedNewPassword, userId]);

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error: any) {
        console.error("Error changing password:", error.message);
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
        const finalUserId = isGuestPayer ? null : paid_by_id;
        const finalGuestId = isGuestPayer ? parseInt(paid_by_id.replace('guest_', '')) : null;

        const [expenseResult] = await db.query(
            "INSERT INTO expenses (bill_id, expense_name, total_amount, paid_by_user_id, paid_by_guest_id, split_type) VALUES (?, ?, ?, ?, ?, ?)",
            [billId, expense_name, total_amount, finalUserId, finalGuestId, split_type]
        ) as any[];

        const expenseId = expenseResult.insertId;

        // Add splits
        if (involved_person_ids && involved_person_ids.length > 0) {
            const splitAmount = total_amount / involved_person_ids.length;
            for (const pid of involved_person_ids) {
                const isGuest = typeof pid === 'string' && pid.startsWith('guest_');
                const uId = isGuest ? null : pid;
                const gId = isGuest ? parseInt(pid.replace('guest_', '')) : null;

                await db.query(
                    "INSERT INTO expense_splits (expense_id, user_id, guest_user_id, amount) VALUES (?, ?, ?, ?)",
                    [expenseId, uId, gId, splitAmount]
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

// Helper for Summarized Debt & Activity
async function getDebtActivity(userId: string) {
    // 1. Get all bills the user is involved in
    const [bills] = await db.query(`
        SELECT DISTINCT b.* FROM bills b
        JOIN involved_persons ip ON b.id = ip.bill_id
        WHERE (b.created_by = ? OR ip.user_id = ?) AND b.archived_at IS NULL
    `, [userId, userId]) as any[];

    let activity: any[] = [];

    for (const bill of bills) {
        // Fetch all involved persons for the names
        const [ipRaw] = await db.query(`
            SELECT ip.id as record_id, ip.user_id, ip.guest_user_id, 
                   u.nickname as user_nickname, u.first_name as user_first, u.last_name as user_last,
                   g.nickname as guest_nickname, g.first_name as guest_first, g.last_name as guest_last
            FROM involved_persons ip
            LEFT JOIN users u ON ip.user_id = u.id
            LEFT JOIN guest_users g ON ip.guest_user_id = g.id
            WHERE ip.bill_id = ?
        `, [bill.id]) as any[];

        const personsMap: Record<string, string> = {};
        ipRaw.forEach((row: any) => {
            const id = row.guest_user_id ? `guest_${row.guest_user_id}` : row.user_id;
            personsMap[String(id)] = row.user_nickname || row.guest_nickname || row.user_first || row.guest_first || "Someone";
        });

        // Fetch all expenses and their splits for this bill
        const [expenses] = await db.query("SELECT * FROM expenses WHERE bill_id = ?", [bill.id]) as any[];
        const [splits] = await db.query(`
            SELECT es.* FROM expense_splits es 
            JOIN expenses e ON es.expense_id = e.id 
            WHERE e.bill_id = ?
        `, [bill.id]) as any[];

        // Fetch all settlements for this bill
        const [settlements] = await db.query("SELECT * FROM settlements WHERE bill_id = ?", [bill.id]) as any[];

        // Calculate balances (just like in the frontend calculateDebts function)
        const pairwiseBalances: Record<string, Record<string, number>> = {};
        const memberIds = Object.keys(personsMap);
        memberIds.forEach(id1 => {
            pairwiseBalances[id1] = {};
            memberIds.forEach(id2 => { pairwiseBalances[id1][id2] = 0; });
        });

        // a. Process expenses: payer is owed by splits
        expenses.forEach((exp: any) => {
            const payerId = String(exp.paid_by_guest_id ? `guest_${exp.paid_by_guest_id}` : exp.paid_by_user_id);
            const expSplits = splits.filter((s: any) => s.expense_id === exp.id);
            expSplits.forEach((split: any) => {
                const splitUserId = String(split.guest_user_id ? `guest_${split.guest_user_id}` : split.user_id);
                if (splitUserId === payerId) return;
                if (pairwiseBalances[splitUserId] && pairwiseBalances[splitUserId][payerId] !== undefined) {
                    pairwiseBalances[splitUserId][payerId] += Number(split.amount);
                }
            });
        });

        // b. Process settlements: reduces debt
        settlements.forEach((settle: any) => {
            const payerId = String(settle.paid_by_guest_id ? `guest_${settle.paid_by_guest_id}` : settle.paid_by_user_id);
            const payeeId = String(settle.paid_to_guest_id ? `guest_${settle.paid_to_guest_id}` : settle.paid_to_user_id);
            if (pairwiseBalances[payerId] && pairwiseBalances[payerId][payeeId] !== undefined) {
                pairwiseBalances[payerId][payeeId] -= Number(settle.amount);
            }
        });

        // c. Convert pairwise balances to net debts for the current user
        const currentUserIdStr = String(userId);
        memberIds.forEach(otherId => {
            if (otherId === currentUserIdStr) return;
            const userOwesOther = pairwiseBalances[currentUserIdStr][otherId] || 0;
            const otherOwesUser = pairwiseBalances[otherId][currentUserIdStr] || 0;
            const netAmount = userOwesOther - otherOwesUser;

            if (Math.abs(netAmount) > 0.01) {
                activity.push({
                    id: `debt_${bill.id}_${otherId}`,
                    type: netAmount > 0 ? 'owe' : 'lent',
                    title: netAmount > 0 ? `You owe ${personsMap[otherId]}` : `${personsMap[otherId]} owes you`,
                    bill_name: bill.bill_name,
                    amount: `₱${Math.abs(netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    rawAmount: Math.abs(netAmount),
                    status: 'Pending',
                    date: new Date(bill.created_at).toLocaleDateString(),
                    rawDate: bill.created_at
                });
            }
        });

        // d. Include actual settlement events as activities (sorted by created_at later)
        settlements.forEach((s: any) => {
            const payerId = String(s.paid_by_guest_id ? `guest_${s.paid_by_guest_id}` : s.paid_by_user_id);
            const payeeId = String(s.paid_to_guest_id ? `guest_${s.paid_to_guest_id}` : s.paid_to_user_id);

            // If the user participated in this settlement
            if (payerId === currentUserIdStr || payeeId === currentUserIdStr) {
                const isPayer = payerId === currentUserIdStr;
                const otherParty = isPayer ? personsMap[payeeId] : personsMap[payerId];
                activity.push({
                    id: `settle_${s.id}`,
                    type: isPayer ? 'owe' : 'lent', // Using same type for consistent coloring
                    title: isPayer ? `You paid ${otherParty}` : `${otherParty} paid you`,
                    bill_name: bill.bill_name,
                    amount: `₱${parseFloat(s.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    rawAmount: parseFloat(s.amount),
                    status: 'Completed',
                    date: new Date(s.created_at).toLocaleDateString(),
                    rawDate: s.created_at
                });
            }
        });
    }

    // Sort all activity by date
    return activity.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
}

// ==================== DASHBOARD ENDPOINTS ====================

app.get("/api/dashboard/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        // 1. Calculate stats (Dynamic now!)
        const activity = await getDebtActivity(userId as string);

        // Owed to you: sum of 'lent' with 'Pending' status
        const dynamicOwedToYou = activity
            .filter(item => item.type === 'lent' && item.status === 'Pending')
            .reduce((sum, item) => sum + (item.rawAmount || 0), 0);

        // You owe: sum of 'owe' with 'Pending' status
        const dynamicYouOwe = activity
            .filter(item => item.type === 'owe' && item.status === 'Pending')
            .reduce((sum, item) => sum + (item.rawAmount || 0), 0);

        const [activeBillsResult] = await db.query(`
            SELECT COUNT(DISTINCT b.id) as count
            FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE (b.created_by = ? OR ip.user_id = ?) AND b.archived_at IS NULL
        `, [userId, userId]) as any[];

        // 2. Recent Activity (Summarized)
        // const activity = await getDebtActivity(userId as string); // This line was moved up

        res.status(200).json({
            stats: {
                owed_to_you: dynamicOwedToYou,
                you_owe: dynamicYouOwe,
                active_bills: activeBillsResult[0]?.count || 0
            },
            recentActivity: activity.slice(0, 5)
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
        const activity = await getDebtActivity(userId as string);
        res.status(200).json({ activities: activity });
    } catch (error: any) {
        console.error("Error fetching activity data:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==================== GROUPS ENDPOINTS (RETAINED FOR LEGACY) ====================

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

        const clientUrl = req.headers.origin || 'http://localhost:8111';
        const resetLink = `${clientUrl}/reset-password?token=${token}`;

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

app.post("/api/users/upgrade-guest", async (req: Request, res: Response) => {
    const { guest_id, first_name, last_name, nickname, email, username, password } = req.body;

    if (!guest_id || !first_name || !last_name || !email || !password) {
        return res.status(400).json({ message: "All guest details and a password are required" });
    }

    try {
        // 1. Check if email is already in use by a registered user
        const [existingUsers] = await db.query("SELECT id FROM users WHERE email = ?", [email]) as any[];
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "This email is already associated with a registered account. Please log in instead." });
        }

        // 2. Create the user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const finalUsername = username || email.split('@')[0] + Math.floor(Math.random() * 1000);
        const finalNickname = nickname || first_name;

        const [userResult] = await db.query(
            "INSERT INTO users (first_name, last_name, nickname, email, username, password_hash, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [first_name, last_name, finalNickname, email, finalUsername, hashedPassword, 1]
        ) as any[];

        const newUserId = userResult.insertId;

        // 3. Migrate data from guest to user in critical tables
        await db.query("UPDATE involved_persons SET user_id = ?, guest_user_id = NULL WHERE guest_user_id = ?", [newUserId, guest_id]);
        await db.query("UPDATE expenses SET paid_by_user_id = ?, paid_by_guest_id = NULL WHERE paid_by_guest_id = ?", [newUserId, guest_id]);
        await db.query("UPDATE expense_splits SET user_id = ?, guest_user_id = NULL WHERE guest_user_id = ?", [newUserId, guest_id]);

        // 4. Optionally delete/deactivate guest_user record
        // await db.query("DELETE FROM guest_users WHERE id = ?", [guest_id]);

        const [newUser] = await db.query("SELECT id, first_name, last_name, nickname, email, username FROM users WHERE id = ?", [newUserId]) as any[];

        res.status(200).json({
            message: "Account upgraded successfully",
            user: newUser[0]
        });

    } catch (error: any) {
        console.error("Upgrade guest error:", error.message);
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