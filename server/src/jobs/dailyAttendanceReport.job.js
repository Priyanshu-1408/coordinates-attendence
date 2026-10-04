import cron from 'node-cron';
import Attendance from '../models/Attendance.js';
import DailyAttendanceReport from '../models/DailyAttendanceReport.js';
import User from '../models/User.js';
import { sendDailyAttendanceReport } from '../services/email.service.js';
import { indiaDateKey, indiaTimeLabel } from '../utils/attendanceTime.js';

const TIME_ZONE = 'Asia/Kolkata';
const STALE_PROCESSING_MS = 30 * 60 * 1000;

async function claimReportDate(date) {
  const now = new Date();
  try {
    await DailyAttendanceReport.create({ date, state: 'processing', startedAt: now });
    return { claimed: true };
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const existing = await DailyAttendanceReport.findOne({ date });
  if (!existing) return { claimed: false, reason: 'in_progress' };
  if (existing.state === 'sent') return { claimed: false, reason: 'already_sent' };
  if (existing.state === 'processing') {
    const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS);
    const reclaim = await DailyAttendanceReport.updateOne(
      { _id: existing._id, state: 'processing', startedAt: { $lt: staleBefore } },
      { $set: { startedAt: now } },
    );
    return reclaim.modifiedCount === 1
      ? { claimed: true }
      : { claimed: false, reason: 'in_progress' };
  }

  const retry = await DailyAttendanceReport.updateOne(
    { _id: existing._id, state: 'failed' },
    { $set: { state: 'processing', startedAt: now }, $unset: { sentAt: 1 } },
  );
  return retry.modifiedCount === 1
    ? { claimed: true }
    : { claimed: false, reason: 'in_progress' };
}

function safeJobError(error) {
  return typeof error?.code === 'string' ? error.code : 'REPORT_JOB_FAILED';
}

export async function runDailyAttendanceReport({
  trigger = 'manual',
  date = indiaDateKey(new Date()),
  sendReport = sendDailyAttendanceReport,
} = {}) {
  console.log(`[daily-report] Starting report for ${date}; trigger=${trigger}`);
  let claim;
  try {
    await DailyAttendanceReport.init();
    claim = await claimReportDate(date);
    if (!claim.claimed) {
      console.log(`[daily-report] Skipping ${date}; ${claim.reason}`);
      return { sent: false, skipped: true, reason: claim.reason, date };
    }

    const [employees, attendanceRecords] = await Promise.all([
      User.find({ role: 'employee' }).select('employeeId name email').sort({ employeeId: 1 }).lean(),
      Attendance.find({ date }).select('employee punchInTimestamp status').lean(),
    ]);
    const byEmployee = new Map(attendanceRecords.map((record) => [String(record.employee), record]));
    const rows = employees.map((employee) => {
      const record = byEmployee.get(String(employee._id));
      return {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        punchInTime: record ? indiaTimeLabel(record.punchInTimestamp) : null,
        status: record?.status ?? 'Absent',
      };
    });

    const sent = await sendReport({ date, rows });
    await DailyAttendanceReport.updateOne(
      { date, state: 'processing' },
      sent
        ? { $set: { state: 'sent', sentAt: new Date() } }
        : { $set: { state: 'failed' } },
    );

    if (sent) {
      console.log(`[daily-report] Successfully sent report for ${date}; employees=${rows.length}`);
    } else {
      console.error(`[daily-report] Report email was not sent for ${date}`);
    }
    return { sent, skipped: false, date, employeeCount: rows.length };
  } catch (error) {
    if (claim?.claimed) {
      await DailyAttendanceReport.updateOne({ date, state: 'processing' }, { $set: { state: 'failed' } }).catch(() => {});
    }
    console.error(`[daily-report] Report failed for ${date}`, { code: safeJobError(error) });
    return { sent: false, skipped: false, reason: 'failed', date };
  }
}

export function startDailyAttendanceReportJob() {
  return cron.schedule('0 12 * * *', () => runDailyAttendanceReport({ trigger: 'cron' }), {
    timezone: TIME_ZONE,
    noOverlap: true,
  });
}
