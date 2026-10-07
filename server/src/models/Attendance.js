import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    punchInTimestamp: { type: Date, required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    distanceFromOffice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Present", "Late"], required: true },
    warningEmailSent: { type: Boolean, default: false, required: true },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { versionKey: false },
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
