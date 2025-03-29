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
  port: process.env.PORT || 3000,
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 100,
  connectTimeout: 180000, // ✅ Correct timeout option
});

// Function to check the database connection
export const connectDB = async () => {
  try {
    const connection = await db.getConnection(); // Try to get a connection
    // logger.info('✅ MySQL Database connected successfully');
    console.log('✅ MySQL Database connected successfully');
    
    connection.release(); // Release the connection back to the pool
  } catch (error) {
  console.log('❌ Database connection failed:', error.message); // Log error message
   
    
    setTimeout(connectDB, 5000); // Retry connection after 5 seconds
  }
};

// Function to handle database errors
db.on('error', async (err) => {
console.log('❌ Database error:', err);

  // Handle connection loss or lock timeout
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ER_LOCK_WAIT_TIMEOUT') {
   console.log('🔄 Reconnecting to the database...');
    await connectDB(); // Attempt to reconnect
  }
});

// Connect to the database initially
connectDB();
