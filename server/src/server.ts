import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { db, connectDB } from "./db";

const app = express();
const PORT = 5001;

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


        await db.query(
            "INSERT INTO users (first_name, last_name, nickname, email, username, password_hash, user_type_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [firstName, lastName, nickname, email, username, hashedPassword, 1]
        );

        res.status(201).json({ message: "User registered successfully" });
    } catch (error: any) {
        console.error("Registration error:", error.message);
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
            "SELECT * FROM users WHERE username = ?",
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

        // Exclude password_hash from the response payload
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});