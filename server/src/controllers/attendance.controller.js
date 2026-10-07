import Attendance from "../models/Attendance.js";
import { env } from "../config/env.js";
import { distanceInMeters } from "../utils/distance.js";
import { sendLateAttendanceNotifications } from "../services/email.service.js";
import {
  attendanceStatus,
  indiaDateKey,
  indiaTimeLabel,
} from "../utils/attendanceTime.js";

function officeConfigurationError() {
  return (
    !Number.isFinite(env.officeLatitude) ||
    env.officeLatitude < -90 ||
    env.officeLatitude > 90 ||
    !Number.isFinite(env.officeLongitude) ||
    env.officeLongitude < -180 ||
    env.officeLongitude > 180 ||
    !Number.isFinite(env.officeRadiusMeters) ||
    env.officeRadiusMeters <= 0
  );
}

export async function today(request, response, next) {
  try {
    const date = indiaDateKey(new Date());
    const attendance = await Attendance.findOne({
      employee: request.user.id,
      date,
    });
    return response.json({
      date,
      attendance: attendance
        ? {
            status: attendance.status,
            punchInTimestamp: attendance.punchInTimestamp,
            punchInTime: indiaTimeLabel(attendance.punchInTimestamp),
          }
        : null,
    });
  } catch (error) {
    return next(error);
  }
}

export async function punchIn(request, response, next) {
  try {
    if (officeConfigurationError()) {
      return response.status(503).json({
        error: "Office location is not configured. Contact your administrator.",
      });
    }

    const { latitude, longitude } = request.body ?? {};
    if (
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== "number" ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return response
        .status(400)
        .json({ error: "A valid latitude and longitude are required." });
    }

    const now = new Date();
    const date = indiaDateKey(now);
    const existing = await Attendance.findOne({
      employee: request.user.id,
      date,
    });
    if (existing) {
      return response.status(409).json({
        error: "You have already punched in today.",
        attendance: {
          status: existing.status,
          punchInTimestamp: existing.punchInTimestamp,
          punchInTime: indiaTimeLabel(existing.punchInTimestamp),
        },
      });
    }

    const distance = distanceInMeters(
      latitude,
      longitude,
      env.officeLatitude,
      env.officeLongitude,
    );
    if (distance > env.officeRadiusMeters) {
      return response.status(403).json({
        error: `Punch-in is only allowed within ${env.officeRadiusMeters} meters of the office. You are approximately ${Math.round(distance)} meters away.`,
        distanceFromOffice: Math.round(distance),
      });
    }

    const attendance = await Attendance.create({
      employee: request.user.id,
      date,
      punchInTimestamp: now,
      latitude,
      longitude,
      distanceFromOffice: Math.round(distance * 100) / 100,
      status: attendanceStatus(now),
      warningEmailSent: false,
    });

    if (attendance.status === "Late" && !attendance.warningEmailSent) {
      try {
        const { employeeWarningSent } = await sendLateAttendanceNotifications({
          employee: request.user,
          attendance,
        });
        if (employeeWarningSent) {
          attendance.warningEmailSent = true;
          try {
            await attendance.save();
          } catch (error) {
            console.error("[email] could not record warning email state", {
              code:
                typeof error?.code === "string"
                  ? error.code
                  : "DATABASE_UPDATE_FAILED",
            });
          }
        }
      } catch (error) {
        // Attendance is already saved. Email failures must never undo the punch-in.
        console.error("[email] late attendance notifications failed", {
          code:
            typeof error?.code === "string" ? error.code : "EMAIL_SEND_FAILED",
        });
      }
    }

    return response.status(201).json({
      message: "Punch-in recorded successfully.",
      attendance: {
        status: attendance.status,
        punchInTimestamp: attendance.punchInTimestamp,
        punchInTime: indiaTimeLabel(attendance.punchInTimestamp),
        distanceFromOffice: attendance.distanceFromOffice,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return response
        .status(409)
        .json({ error: "You have already punched in today." });
    }
    return next(error);
  }
}
