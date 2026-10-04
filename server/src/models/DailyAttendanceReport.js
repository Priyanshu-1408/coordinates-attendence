import mongoose from 'mongoose';

const dailyAttendanceReportSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  state: { type: String, enum: ['processing', 'sent', 'failed'], required: true },
  startedAt: { type: Date, required: true },
  sentAt: { type: Date },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });

export default mongoose.model('DailyAttendanceReport', dailyAttendanceReportSchema);
