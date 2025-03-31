import mysql from 'mysql2/promise'; // Import MySQL library
import dotenv from 'dotenv';
// import { logger } from '../utils/logger.js'; // Import logger utility

dotenv.config(); // Load environment variables

// Create a connection pool to the MySQL database
export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'AI_chatBot',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // ⬅ Reduce from 50 to 10
  queueLimit: 50, // ⬅ Reduce queue limit
  connectTimeout: 60000, // ✅ Correct timeout option
});

// Function to check the database connection
export const connectDB = async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL Database connected successfully');

    // Periodically ping the database to keep the connection alive
    // setInterval(async () => {
    //   try {
    //     await db.execute('SELECT 1'); // Keep the connection alive
    //     console.log('🔄 Keeping MySQL connection alive...');
    //   } catch (err) {
    //     console.error('❌ MySQL keep-alive failed:', err.message);
    //   }
    // }); // Ping every 60 seconds

    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
};


// Function to handle database errors
db.on('error', (err) => {
  console.error('❌ Database Error:', err);
});


// Connect to the database initially
connectDB();
