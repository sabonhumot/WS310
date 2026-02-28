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
        connection.release();
    } catch (err: any) {
        console.error("❌ Database connection failed:", err.message);
        process.exit(1);
    }
};

export default db;
