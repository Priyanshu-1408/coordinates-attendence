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

async function sendMessage({ to, subject, text }, kind) {
  try {
    await getTransporter().sendMail({ from: env.emailUser, to, subject, text });
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
