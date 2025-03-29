import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chatRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { connectDB } from './db/db.js';
// import { logger } from '../utils/logger.js';

dotenv.config(); // Load environment variables

const app = express();

// Middleware Setup
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/test', chatRoutes);
app.use('/api/pdf', pdfRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server Function
const startServer = async () => {
  try {
    // Connect to the database
    await connectDB();
    console.log('✅ Database connected successfully');

    const PORT = process.env.PORT || 3000; // Define PORT correctly

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Handle process termination (PM2, Docker, Kubernetes)
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received. Closing server gracefully...');
      server.close(() => {
        console.log('💡 Server closed. Exiting process.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to connect to the database. Server not started.', error);
    process.exit(1); // Exit if DB connection fails
  }
};

// Start the server
startServer();

export { app, startServer };
