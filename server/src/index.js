import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { startDailyAttendanceReportJob } from './jobs/dailyAttendanceReport.job.js';

async function startServer() {
  try {
    if (!env.jwtSecret || env.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters.');
    }
    await connectDatabase();
    startDailyAttendanceReportJob();
    app.listen(env.port, () => {
      console.log(`API server listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Unable to start API server:', error.message);
    process.exit(1);
  }
}

startServer();
