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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.db = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// We'll still use a pool internally because it's the standard way to handle 
// multiple concurrent requests in a web server, but we'll export it as 'db'
// to simplify the terminology for the rest of the app.
exports.db = promise_1.default.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connection = yield exports.db.getConnection();
        console.log("✅ Connected to the MySQL database (splitbill)");
        // Create tables if they don't exist
        yield initializeTables(connection);
        connection.release();
    }
    catch (err) {
        console.error("❌ Database connection failed:", err.message);
        process.exit(1);
    }
});
exports.connectDB = connectDB;
const initializeTables = (connection) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Bills table
        yield connection.query(`
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
        yield connection.query(`
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
        yield connection.query(`
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
        yield connection.query(`
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
        yield connection.query(`
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
        yield connection.query(`
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
    }
    catch (error) {
        console.error("Error initializing tables:", error.message);
    }
});
exports.default = exports.db;
