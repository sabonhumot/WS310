"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const PORT = 5001;
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize Database
(0, db_1.connectDB)();
app.get("/", (req, res) => {
    res.send("Backend running!");
});
app.post("/api/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstName, lastName, nickname, email, username, password } = req.body;
    if (!firstName || !lastName || !nickname || !email || !username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const [existingUsers] = yield db_1.db.query("SELECT email, username, nickname FROM users WHERE email = ? OR username = ? OR nickname = ?", [email, username, nickname]);
        if (existingUsers.length > 0) {
            const user = existingUsers[0];
            if (user.email === email)
                return res.status(400).json({ message: "Email already in use" });
            if (user.username === username)
                return res.status(400).json({ message: "Username already taken" });
            if (user.nickname === nickname)
                return res.status(400).json({ message: "Nickname already taken" });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        // Insert user first
        const [insertUserResult] = yield db_1.db.query("INSERT INTO users (first_name, last_name, nickname, email, username, password_hash, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?)", [firstName, lastName, nickname, email, username, hashedPassword, 1]);
        const userId = insertUserResult.insertId;
        console.log('✓ User created with ID:', userId);
        // Generate verification token
        const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log('✓ Generated verification token:', verificationToken);
        // Calculate expiration time (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        console.log('✓ Token expires at:', expiresAt.toISOString());
        // Store token in email_verifications table
        yield db_1.db.query("INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)", [userId, verificationToken, expiresAt]);
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
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('✗ Error sending email:', error);
            }
            else {
                console.log('✓ Email sent successfully to:', email);
            }
        });
        res.status(201).json({ message: "User registered successfully. Please check your email to verify your account." });
    }
    catch (error) {
        console.error("Registration error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
app.get("/api/verify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
    }
    try {
        console.log('\n=== EMAIL VERIFICATION REQUEST ===');
        console.log('Token received:', token);
        // Check if token exists and is not expired
        const [verificationRecords] = yield db_1.db.query("SELECT id, user_id, expires_at, verified_at FROM email_verifications WHERE token = ?", [token]);
        console.log('Database query executed');
        console.log('Records found:', verificationRecords === null || verificationRecords === void 0 ? void 0 : verificationRecords.length);
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
        const [updateVerificationResult] = yield db_1.db.query("UPDATE email_verifications SET verified_at = NOW() WHERE id = ?", [verificationRecord.id]);
        console.log('✓ Verification record updated');
        // Update user's email_verified status
        const [updateUserResult] = yield db_1.db.query("UPDATE users SET email_verified = 1 WHERE id = ?", [verificationRecord.user_id]);
        console.log('✓ User email_verified flag set to 1');
        console.log('Affected rows:', updateUserResult === null || updateUserResult === void 0 ? void 0 : updateUserResult.affectedRows);
        console.log('✓ Email verification completed successfully\n');
        res.status(200).json({ message: "Email verified successfully. You can now login." });
    }
    catch (error) {
        console.error("Verification error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
app.post("/api/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }
    try {
        const [users] = yield db_1.db.query("SELECT * FROM users WHERE username = ? AND email_verified = 1", [username]);
        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        const user = users[0];
        const isMatch = yield bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        if (user.email_verified !== 1) {
            return res.status(401).json({ message: "Please verify your email before logging in" });
        }
        // Exclude sensitive fields from response
        const { password_hash } = user, userWithoutPassword = __rest(user, ["password_hash"]);
        res.status(200).json({
            message: "Login successful",
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Helper function to generate invite code
const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};
// ==================== BILLS ENDPOINTS ====================
// Create a new bill
app.post("/api/bills", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { created_by, bill_name, invite_code, involved_persons } = req.body;
    if (!created_by || !bill_name) {
        return res.status(400).json({ message: "Bill name and creator are required" });
    }
    try {
        // Enforce Standard User Limits
        const [users] = yield db_1.db.query("SELECT user_type_id FROM users WHERE id = ?", [created_by]);
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
            const [billCount] = yield db_1.db.query("SELECT COUNT(*) as count FROM bills WHERE created_by = ? AND created_at >= ?", [created_by, startDate]);
            if (billCount[0].count >= 5) {
                return res.status(403).json({ message: "Standard users can create a maximum of 5 bills per month." });
            }
        }
        const finalInviteCode = invite_code || generateInviteCode();
        const [result] = yield db_1.db.query("INSERT INTO bills (created_by, bill_name, invite_code) VALUES (?, ?, ?)", [created_by, bill_name, finalInviteCode]);
        const billId = result.insertId;
        // Process involved persons
        if (involved_persons && Array.isArray(involved_persons)) {
            for (const person of involved_persons) {
                if (person.is_guest) {
                    // Create guest user
                    const [guestResult] = yield db_1.db.query("INSERT INTO guest_users (first_name, last_name, nickname, email) VALUES (?, ?, ?, ?)", [person.first_name, person.last_name, person.nickname, person.email]);
                    const guestId = guestResult.insertId;
                    yield db_1.db.query("INSERT INTO involved_persons (bill_id, guest_user_id) VALUES (?, ?)", [billId, guestId]);
                }
                else {
                    // Registered user
                    yield db_1.db.query("INSERT INTO involved_persons (bill_id, user_id) VALUES (?, ?)", [billId, person.user_id || person.id]);
                }
            }
        }
        else {
            // Default: add creator as involved person if no list provided
            yield db_1.db.query("INSERT INTO involved_persons (bill_id, user_id) VALUES (?, ?)", [billId, created_by]);
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
    }
    catch (error) {
        console.error("Error creating bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get all bills for a user (not archived)
app.get("/api/bills/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const [bills] = yield db_1.db.query(`
            SELECT DISTINCT b.* FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE (b.created_by = ? OR ip.user_id = ?) AND b.archived_at IS NULL
            ORDER BY b.created_at DESC
        `, [userId, userId]);
        res.status(200).json({ bills });
    }
    catch (error) {
        console.error("Error fetching bills:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get archived bills for a user
app.get("/api/bills/:userId/archived", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const [bills] = yield db_1.db.query(`
            SELECT DISTINCT b.* FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE (b.created_by = ? OR ip.user_id = ?) AND b.archived_at IS NOT NULL
            ORDER BY b.archived_at DESC
        `, [userId, userId]);
        res.status(200).json({ bills });
    }
    catch (error) {
        console.error("Error fetching archived bills:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get bill details with involved persons and expenses
app.get("/api/bills/:billId/details", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    try {
        const [bills] = yield db_1.db.query("SELECT * FROM bills WHERE id = ?", [billId]);
        if (!bills.length) {
            return res.status(404).json({ message: "Bill not found" });
        }
        // Get involved persons
        const [ipRaw] = yield db_1.db.query(`
            SELECT ip.id as record_id, ip.user_id, ip.guest_user_id, 
                   u.nickname as user_nickname, u.first_name as user_first, u.last_name as user_last, u.email as user_email,
                   g.nickname as guest_nickname, g.first_name as guest_first, g.last_name as guest_last, g.email as guest_email
            FROM involved_persons ip
            LEFT JOIN users u ON ip.user_id = u.id
            LEFT JOIN guest_users g ON ip.guest_user_id = g.id
            WHERE ip.bill_id = ?
        `, [billId]);
        const involvedPersons = ipRaw.map((row) => ({
            id: row.user_id || row.guest_user_id,
            nickname: row.user_nickname || row.guest_nickname,
            first_name: row.user_first || row.guest_first,
            last_name: row.user_last || row.guest_last,
            email: row.user_email || row.guest_email,
            is_guest: !!row.guest_user_id,
            user_id: row.user_id
        }));
        // Get expenses
        const [expensesRaw] = yield db_1.db.query(`
            SELECT e.* FROM expenses e
            WHERE e.bill_id = ?
            ORDER BY e.created_at DESC
        `, [billId]);
        const expenses = yield Promise.all(expensesRaw.map((e) => __awaiter(void 0, void 0, void 0, function* () {
            const [splits] = yield db_1.db.query("SELECT user_id, guest_user_id FROM expense_splits WHERE expense_id = ?", [e.id]);
            return {
                id: e.id,
                bill_id: e.bill_id,
                expense_name: e.expense_name,
                total_amount: parseFloat(e.total_amount),
                paid_by_id: e.paid_by_user_id || e.paid_by_guest_id,
                split_type: e.split_type,
                involved_person_ids: splits.map((s) => s.user_id || s.guest_user_id),
                created_at: e.created_at
            };
        })));
        res.status(200).json({
            bill: bills[0],
            involvedPersons,
            expenses
        });
    }
    catch (error) {
        console.error("Error fetching bill details:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Update bill
app.put("/api/bills/:billId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    const { bill_name } = req.body;
    try {
        yield db_1.db.query("UPDATE bills SET bill_name = ? WHERE id = ?", [bill_name, billId]);
        res.status(200).json({ message: "Bill updated successfully" });
    }
    catch (error) {
        console.error("Error updating bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Archive a bill
app.put("/api/bills/:billId/archive", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    try {
        yield db_1.db.query("UPDATE bills SET archived_at = NOW() WHERE id = ?", [billId]);
        res.status(200).json({ message: "Bill archived successfully" });
    }
    catch (error) {
        console.error("Error archiving bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Restore a bill
app.put("/api/bills/:billId/restore", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    try {
        yield db_1.db.query("UPDATE bills SET archived_at = NULL WHERE id = ?", [billId]);
        res.status(200).json({ message: "Bill restored successfully" });
    }
    catch (error) {
        console.error("Error restoring bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
app.delete("/api/bills/:billId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    try {
        // Delete related expenses first
        yield db_1.db.query("DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE bill_id = ?)", [billId]);
        yield db_1.db.query("DELETE FROM expenses WHERE bill_id = ?", [billId]);
        // Delete involved persons
        yield db_1.db.query("DELETE FROM involved_persons WHERE bill_id = ?", [billId]);
        // Delete bill
        yield db_1.db.query("DELETE FROM bills WHERE id = ?", [billId]);
        res.status(200).json({ message: "Bill deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting bill:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Regenerate invite code
app.post("/api/bills/:billId/regenerate-code", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    try {
        const newCode = generateInviteCode();
        yield db_1.db.query("UPDATE bills SET invite_code = ? WHERE id = ?", [newCode, billId]);
        res.status(200).json({ message: "Code regenerated", invite_code: newCode });
    }
    catch (error) {
        console.error("Error regenerating code:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// ==================== INVOLVED PERSONS ENDPOINTS ====================
// Add involved person (registered or guest)
app.post("/api/bills/:billId/involved-persons", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    const { user_id, guest_data, created_by } = req.body; // Add created_by
    try {
        // Enforce limits if added by a standard user
        if (created_by) {
            const [users] = yield db_1.db.query("SELECT user_type_id FROM users WHERE id = ?", [created_by]);
            if (users.length && users[0].user_type_id === 1) { // Standard User
                const [members] = yield db_1.db.query("SELECT COUNT(*) as count FROM involved_persons WHERE bill_id = ?", [billId]);
                if (members[0].count >= 3) {
                    return res.status(403).json({ message: "Standard users can add a maximum of 3 members per bill." });
                }
            }
        }
        let involvedPersonId;
        if (user_id) {
            // Add registered user
            const [result] = yield db_1.db.query("INSERT INTO involved_persons (bill_id, user_id) VALUES (?, ?)", [billId, user_id]);
            involvedPersonId = result.insertId;
        }
        else if (guest_data) {
            // Add guest user
            const [guestResult] = yield db_1.db.query("INSERT INTO guest_users (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)", [guest_data.first_name, guest_data.last_name, guest_data.email, guest_data.phone || null]);
            const guestUserId = guestResult.insertId;
            const [ipResult] = yield db_1.db.query("INSERT INTO involved_persons (bill_id, guest_user_id) VALUES (?, ?)", [billId, guestUserId]);
            involvedPersonId = ipResult.insertId;
        }
        res.status(201).json({ message: "Person added successfully", involvedPersonId });
    }
    catch (error) {
        console.error("Error adding involved person:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Remove involved person
app.delete("/api/bills/:billId/involved-persons/:personId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId, personId } = req.params;
    try {
        yield db_1.db.query("DELETE FROM involved_persons WHERE id = ? AND bill_id = ?", [personId, billId]);
        res.status(200).json({ message: "Person removed successfully" });
    }
    catch (error) {
        console.error("Error removing involved person:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Guest Join Route via Invite Code
app.post("/api/bills/join", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { invite_code, first_name, last_name, email } = req.body;
    if (!invite_code || !first_name || !last_name || !email) {
        return res.status(400).json({ message: "Invite code, name, and email are required" });
    }
    try {
        const [bills] = yield db_1.db.query("SELECT id, created_by FROM bills WHERE invite_code = ?", [invite_code]);
        if (bills.length === 0) {
            return res.status(404).json({ message: "Invalid invite code" });
        }
        const bill = bills[0];
        // Check user type of bill creator to enforce standard limits
        const [creators] = yield db_1.db.query("SELECT user_type_id FROM users WHERE id = ?", [bill.created_by]);
        if (creators.length && creators[0].user_type_id === 1) {
            const [members] = yield db_1.db.query("SELECT COUNT(*) as count FROM involved_persons WHERE bill_id = ?", [bill.id]);
            if (members[0].count >= 3) {
                return res.status(403).json({ message: "This bill has reached the maximum number of members allowed for a Standard user." });
            }
        }
        // Check if email belongs to a registered user
        const [users] = yield db_1.db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length > 0) {
            return res.status(400).json({
                message: "This email is registered. Please log in to join this bill.",
                requiresLogin: true
            });
        }
        // Create Guest User and add to bill
        // Let's generate a temporary nickname
        const nickname = first_name;
        const [guestResult] = yield db_1.db.query("INSERT INTO guest_users (first_name, last_name, nickname, email) VALUES (?, ?, ?, ?)", [first_name, last_name, nickname, email]);
        const guestUserId = guestResult.insertId;
        // Check if they are already in the bill (just in case)
        const [existingIP] = yield db_1.db.query("SELECT id FROM involved_persons WHERE bill_id = ? AND guest_user_id = ?", [bill.id, guestUserId]);
        if (existingIP.length === 0) {
            yield db_1.db.query("INSERT INTO involved_persons (bill_id, guest_user_id) VALUES (?, ?)", [bill.id, guestUserId]);
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
    }
    catch (error) {
        console.error("Guest join error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Upgrade Guest to Registered User
app.post("/api/guest/upgrade", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { guest_id, password } = req.body;
    if (!guest_id || !password) {
        return res.status(400).json({ message: "Guest ID and password are required" });
    }
    try {
        const [guests] = yield db_1.db.query("SELECT * FROM guest_users WHERE id = ?", [guest_id]);
        if (guests.length === 0) {
            return res.status(404).json({ message: "Guest record not found" });
        }
        const guest = guests[0];
        // Generate a username based on first name and ID
        const username = `${guest.first_name.toLowerCase()}${guest.id}`;
        // Check if email already registered just in case
        const [existingUsers] = yield db_1.db.query("SELECT id FROM users WHERE email = ?", [guest.email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Email is already registered" });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        // Create the user
        const [userResult] = yield db_1.db.query("INSERT INTO users (first_name, last_name, nickname, email, username, password_hash, email_verified, user_type_id) VALUES (?, ?, ?, ?, ?, ?, 1, 1)", [guest.first_name, guest.last_name, guest.nickname, guest.email, username, hashedPassword]);
        const newUserId = userResult.insertId;
        // Transfer records from guest_user_id to user_id
        yield db_1.db.query("UPDATE involved_persons SET user_id = ?, guest_user_id = NULL WHERE guest_user_id = ?", [newUserId, guest_id]);
        yield db_1.db.query("UPDATE expenses SET paid_by_user_id = ?, paid_by_guest_id = NULL WHERE paid_by_guest_id = ?", [newUserId, guest_id]);
        yield db_1.db.query("UPDATE expense_splits SET user_id = ?, guest_user_id = NULL WHERE guest_user_id = ?", [newUserId, guest_id]);
        // Clean up guest record
        yield db_1.db.query("DELETE FROM guest_users WHERE id = ?", [guest_id]);
        // Fetch upgraded user to return
        const [newUsers] = yield db_1.db.query("SELECT * FROM users WHERE id = ?", [newUserId]);
        const upgradedUser = newUsers[0];
        const { password_hash } = upgradedUser, userWithoutPassword = __rest(upgradedUser, ["password_hash"]);
        res.status(200).json({
            message: "Account upgraded successfully",
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error("Guest upgrade error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Search registered users
app.get("/api/users/search", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { q } = req.query;
    try {
        const [users] = yield db_1.db.query("SELECT id, nickname, username, first_name, last_name, email FROM users WHERE nickname LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? LIMIT 10", [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);
        res.status(200).json({ users });
    }
    catch (error) {
        console.error("Error searching users:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// ==================== EXPENSES ENDPOINTS ====================
// Add expense to a bill
app.post("/api/bills/:billId/expenses", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const [guestLookup] = yield db_1.db.query("SELECT guest_user_id FROM involved_persons WHERE guest_user_id IS NOT NULL AND bill_id = ?", [billId]);
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
        const [expenseResult] = yield db_1.db.query("INSERT INTO expenses (bill_id, expense_name, total_amount, paid_by_user_id, paid_by_guest_id, split_type) VALUES (?, ?, ?, ?, ?, ?)", [billId, expense_name, total_amount, finalUserId, finalGuestId, split_type]);
        const expenseId = expenseResult.insertId;
        // Add splits
        if (involved_person_ids && involved_person_ids.length > 0) {
            const splitAmount = total_amount / involved_person_ids.length;
            for (const pid of involved_person_ids) {
                const isUser = !isNaN(Number(pid));
                yield db_1.db.query("INSERT INTO expense_splits (expense_id, user_id, guest_user_id, amount) VALUES (?, ?, ?, ?)", [expenseId, isUser ? pid : null, !isUser ? pid : null, splitAmount]);
            }
        }
        res.status(201).json({ message: "Expense added successfully", expenseId });
    }
    catch (error) {
        console.error("Error adding expense:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get expenses for a bill
app.get("/api/bills/:billId/expenses", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    try {
        const [expenses] = yield db_1.db.query(`
            SELECT e.id, e.expense_name, e.total_amount, e.paid_by_user_id, e.paid_by_guest_id, e.created_at,
                   u.nickname, u.first_name, u.last_name,
                   g.first_name as guest_first_name, g.last_name as guest_last_name
            FROM expenses e
            LEFT JOIN users u ON e.paid_by_user_id = u.id
            LEFT JOIN guest_users g ON e.paid_by_guest_id = g.id
            WHERE e.bill_id = ?
            ORDER BY e.created_at DESC
        `, [billId]);
        // Get splits for each expense
        for (const expense of expenses) {
            const [splits] = yield db_1.db.query(`
                SELECT es.id, es.user_id, es.guest_user_id, es.amount,
                       u.nickname, g.first_name, g.last_name
                FROM expense_splits es
                LEFT JOIN users u ON es.user_id = u.id
                LEFT JOIN guest_users g ON es.guest_user_id = g.id
                WHERE es.expense_id = ?
            `, [expense.id]);
            expense.splits = splits;
        }
        res.status(200).json({ expenses });
    }
    catch (error) {
        console.error("Error fetching expenses:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Delete expense
app.delete("/api/expenses/:expenseId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { expenseId } = req.params;
    try {
        yield db_1.db.query("DELETE FROM expense_splits WHERE expense_id = ?", [expenseId]);
        yield db_1.db.query("DELETE FROM expenses WHERE id = ?", [expenseId]);
        res.status(200).json({ message: "Expense deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting expense:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// ==================== DASHBOARD ENDPOINTS ====================
app.get("/api/dashboard/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { userId } = req.params;
    try {
        // 1. Calculate stats
        // Owed to you: amount from splits where I paid but others are involved
        const [owedToYouResult] = yield db_1.db.query(`
            SELECT SUM(es.amount) as total
            FROM expense_splits es
            JOIN expenses e ON es.expense_id = e.id
            WHERE e.paid_by_user_id = ? AND (es.user_id != ? OR es.user_id IS NULL)
        `, [userId, userId]);
        // You owe: amount from splits where others paid but I am involved
        const [youOweResult] = yield db_1.db.query(`
            SELECT SUM(es.amount) as total
            FROM expense_splits es
            JOIN expenses e ON es.expense_id = e.id
            WHERE (e.paid_by_user_id != ? OR e.paid_by_user_id IS NULL) AND es.user_id = ?
        `, [userId, userId]);
        // Active groups/bills
        const [activeBillsResult] = yield db_1.db.query(`
            SELECT COUNT(DISTINCT b.id) as count
            FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE (b.created_by = ? OR ip.user_id = ?) AND b.archived_at IS NULL
        `, [userId, userId]);
        // 2. Recent Activity
        const [recentActivity] = yield db_1.db.query(`
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
        `, [userId, userId, userId]);
        res.status(200).json({
            stats: {
                owed_to_you: parseFloat(((_a = owedToYouResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0),
                you_owe: parseFloat(((_b = youOweResult[0]) === null || _b === void 0 ? void 0 : _b.total) || 0),
                active_bills: ((_c = activeBillsResult[0]) === null || _c === void 0 ? void 0 : _c.count) || 0
            },
            recentActivity: recentActivity.map((item) => ({
                id: item.id,
                title: item.expense_name,
                amount: `₱${parseFloat(item.total_amount).toLocaleString()}`,
                status: 'Pending', // Simplified for now
                type: item.type,
                date: new Date(item.created_at).toLocaleDateString()
            }))
        });
    }
    catch (error) {
        console.error("Error fetching dashboard data:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// ==================== ACTIVITY ENDPOINTS ====================
app.get("/api/activity/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const [activities] = yield db_1.db.query(`
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
        `, [userId, userId, userId]);
        res.status(200).json({
            activities: activities.map((item) => ({
                id: item.id,
                title: item.expense_name,
                amount: `₱${parseFloat(item.total_amount).toLocaleString()}`,
                status: 'Pending', // Simplified for now
                type: item.type,
                date: new Date(item.created_at).toLocaleDateString()
            }))
        });
    }
    catch (error) {
        console.error("Error fetching activity data:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// ==================== GROUPS ENDPOINTS ====================
app.get("/api/groups/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        // Fetch bills where the user is involved
        const [bills] = yield db_1.db.query(`
            SELECT DISTINCT b.* 
            FROM bills b
            JOIN involved_persons ip ON b.id = ip.bill_id
            WHERE b.created_by = ? OR ip.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId, userId]);
        const groups = yield Promise.all(bills.map((bill) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            // Get member count
            const [members] = yield db_1.db.query("SELECT COUNT(*) as count FROM involved_persons WHERE bill_id = ?", [bill.id]);
            // Calculate user's balance in this group
            // 1. Amount user paid but split with others (lent)
            const [lentResult] = yield db_1.db.query(`
                SELECT SUM(es.amount) as total
                FROM expense_splits es
                JOIN expenses e ON es.expense_id = e.id
                WHERE e.bill_id = ? AND e.paid_by_user_id = ? AND (es.user_id != ? OR es.user_id IS NULL)
            `, [bill.id, userId, userId]);
            // 2. Amount others paid but user is involved (owe)
            const [oweResult] = yield db_1.db.query(`
                SELECT SUM(es.amount) as total
                FROM expense_splits es
                JOIN expenses e ON es.expense_id = e.id
                WHERE e.bill_id = ? AND (e.paid_by_user_id != ? OR e.paid_by_user_id IS NULL) AND es.user_id = ?
            `, [bill.id, userId, userId]);
            const lent = parseFloat(((_a = lentResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0);
            const owe = parseFloat(((_b = oweResult[0]) === null || _b === void 0 ? void 0 : _b.total) || 0);
            const netBalance = lent - owe;
            let balanceText = "Settled up";
            if (netBalance > 0)
                balanceText = `₱${netBalance.toLocaleString()} to collect`;
            if (netBalance < 0)
                balanceText = `₱${Math.abs(netBalance).toLocaleString()} owed`;
            return {
                id: bill.id,
                name: bill.bill_name,
                members: members[0].count,
                balance: balanceText,
                netBalance: netBalance
            };
        })));
        res.status(200).json({ groups });
    }
    catch (error) {
        console.error("Error fetching groups:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// ==================== PASSWORD RESET ENDPOINTS ====================
app.post("/api/forgot-password", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const [users] = yield db_1.db.query("SELECT id, first_name FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            // Return 200 even if user doesn't exist for security
            return res.status(200).json({ message: "If an account exists, a reset link has been sent." });
        }
        const user = users[0];
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration
        yield db_1.db.query("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id, token, expiresAt]);
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
        yield transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Reset link sent successfully" });
    }
    catch (error) {
        console.error("Forgot password error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
app.post("/api/reset-password", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, password } = req.body;
    try {
        const [resets] = yield db_1.db.query("SELECT user_id FROM password_resets WHERE token = ? AND expires_at > NOW()", [token]);
        if (resets.length === 0) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }
        const userId = resets[0].user_id;
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        // Update password
        yield db_1.db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, userId]);
        // Delete used token
        yield db_1.db.query("DELETE FROM password_resets WHERE user_id = ?", [userId]);
        res.status(200).json({ message: "Password updated successfully" });
    }
    catch (error) {
        console.error("Reset password error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
