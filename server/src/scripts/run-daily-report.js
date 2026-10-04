import { connectDatabase } from '../config/database.js';
import { runDailyAttendanceReport } from '../jobs/dailyAttendanceReport.job.js';
import mongoose from 'mongoose';

try {
  await connectDatabase();
  const result = await runDailyAttendanceReport({ trigger: 'manual' });
  if (!result.sent && !result.skipped) process.exitCode = 1;
} catch (error) {
  console.error('[daily-report] Manual run failed', {
    code: typeof error?.code === 'string' ? error.code : 'REPORT_JOB_FAILED',
  });
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
