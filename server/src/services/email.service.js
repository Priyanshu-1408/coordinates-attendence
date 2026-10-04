import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { indiaTimeLabel } from '../utils/attendanceTime.js';

let transporter;

function logEmailFailure(kind, error) {
  // Deliberately omit error.message and transport details, which may contain account data.
  console.error(`[email] ${kind} could not be sent`, {
    code: typeof error?.code === 'string' ? error.code : 'EMAIL_SEND_FAILED',
  });
}

function isPlaceholder(value) {
  return !value || /your_|placeholder|example\.(com|org|net)/i.test(value);
}

function getTransporter() {
  if (isPlaceholder(env.emailUser) || isPlaceholder(env.emailAppPassword)) {
    const error = new Error('Email credentials are not configured');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.emailUser, pass: env.emailAppPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

async function sendMessage({ to, subject, text, html }, kind) {
  try {
    await getTransporter().sendMail({ from: env.emailUser, to, subject, text, ...(html ? { html } : {}) });
    return true;
  } catch (error) {
    logEmailFailure(kind, error);
    return false;
  }
}

export async function sendLateAttendanceNotifications({ employee, attendance }) {
  const punchInTime = indiaTimeLabel(attendance.punchInTimestamp);
  const employeeResult = await sendMessage({
    to: employee.email,
    subject: 'Late attendance warning',
    text: [
      `Hello ${employee.name},`,
      '',
      'Your attendance has been marked Late.',
      `Date: ${attendance.date}`,
      `Punch-in time: ${punchInTime}`,
      'Status: Late',
    ].join('\n'),
  }, 'employee warning');

  if (!isPlaceholder(env.hrEmail)) {
    await sendMessage({
      to: env.hrEmail,
      subject: `Late attendance: ${employee.name}`,
      text: [
        'A late attendance punch-in was recorded.',
        `Employee name: ${employee.name}`,
        `Employee ID: ${employee.employeeId}`,
        `Employee email: ${employee.email}`,
        `Date: ${attendance.date}`,
        `Punch-in time: ${punchInTime}`,
        'Status: Late',
      ].join('\n'),
    }, 'HR notification');
  } else {
    logEmailFailure('HR notification', { code: 'EMAIL_NOT_CONFIGURED' });
  }

  return { employeeWarningSent: employeeResult };
}

export function buildDailyAttendanceReportContent({ date, rows }) {
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.employeeId)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.email)}</td>
      <td>${escapeHtml(row.punchInTime || '—')}</td>
      <td>${escapeHtml(row.status)}</td>
    </tr>`).join('');
  const html = `<!doctype html>
    <html><body>
      <h1>Daily attendance report</h1>
      <p>Date: ${escapeHtml(date)} (IST)</p>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse">
        <thead><tr><th>Employee ID</th><th>Employee Name</th><th>Email</th><th>Punch-in Time</th><th>Status</th></tr></thead>
        <tbody>${bodyRows || '<tr><td colspan="5">No registered employees</td></tr>'}</tbody>
      </table>
    </body></html>`;
  const text = [
    `Daily attendance report - ${date} (IST)`,
    '',
    'Employee ID | Employee Name | Email | Punch-in Time | Status',
    ...rows.map((row) => `${row.employeeId} | ${row.name} | ${row.email} | ${row.punchInTime || '—'} | ${row.status}`),
  ].join('\n');

  return { subject: `Daily attendance report - ${date}`, text, html };
}

export async function sendDailyAttendanceReport({ date, rows }) {
  if (isPlaceholder(env.hrEmail)) {
    logEmailFailure('daily attendance report', { code: 'EMAIL_NOT_CONFIGURED' });
    return false;
  }

  const content = buildDailyAttendanceReportContent({ date, rows });

  return sendMessage({
    to: env.hrEmail,
    ...content,
  }, 'daily attendance report');
}
