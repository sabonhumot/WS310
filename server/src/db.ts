import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// We'll still use a pool internally because it's the standard way to handle 
// multiple concurrent requests in a web server, but we'll export it as 'db'
// to simplify the terminology for the rest of the app.
export const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

});

export const connectDB = async () => {
    try {
        const connection = await db.getConnection();
        console.log("✅ Connected to the MySQL database (splitbill)");
        
        // Create tables if they don't exist
        await initializeTables(connection);
        
        connection.release();
    } catch (err: any) {
        console.error("❌ Database connection failed:", err.message);
        process.exit(1);
    }
};

const initializeTables = async (connection: any) => {
    try {
        // Bills table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS bills (
                id INT AUTO_INCREMENT PRIMARY KEY,
                created_by INT NOT NULL,
                bill_name VARCHAR(255) NOT NULL,
                invite_code VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                archived_at TIMESTAMP NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Guest users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS guest_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name VARCHAR(255) NOT NULL,
                last_name VARCHAR(255) NOT NULL,
                nickname VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Involved persons (can be registered or guest users)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS involved_persons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bill_id INT NOT NULL,
                user_id INT,
                guest_user_id INT,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE SET NULL
            )
        `);

        // Expenses table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bill_id INT NOT NULL,
                expense_name VARCHAR(255) NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                paid_by_user_id INT,
                paid_by_guest_id INT,
                split_type ENUM('equally', 'custom') DEFAULT 'equally',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
                FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (paid_by_guest_id) REFERENCES guest_users(id) ON DELETE SET NULL
            )
        `);

        // Expense splits table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS expense_splits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expense_id INT NOT NULL,
                user_id INT,
                guest_user_id INT,
                amount DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE SET NULL
            )
        `);

        // Password resets table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log("✅ Database tables initialized");
    } catch (error: any) {
        console.error("Error initializing tables:", error.message);
    }
};

export default db;
