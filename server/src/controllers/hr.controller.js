import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { indiaDateKey, indiaTimeLabel } from "../utils/attendanceTime.js";

function isValidDateKey(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

async function attendanceForDate(date) {
  const [employees, records] = await Promise.all([
    User.find({ role: "employee" })
      .select("employeeId name email createdAt")
      .sort({ employeeId: 1 })
      .lean(),
    Attendance.find({ date }).select("employee punchInTimestamp status").lean(),
  ]);
  const recordsByEmployee = new Map(
    records.map((record) => [String(record.employee), record]),
  );
  const rows = employees.map((employee) => {
    const record = recordsByEmployee.get(String(employee._id));
    return {
      id: String(employee._id),
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      punchInTimestamp: record?.punchInTimestamp ?? null,
      punchInTime: record ? indiaTimeLabel(record.punchInTimestamp) : null,
      status: record?.status ?? "Absent",
    };
  });
  const summary = {
    totalEmployees: rows.length,
    present: rows.filter((row) => row.status === "Present").length,
    late: rows.filter((row) => row.status === "Late").length,
    absent: rows.filter((row) => row.status === "Absent").length,
  };
  return { date, summary, employees: rows };
}

export async function listEmployees(_request, response, next) {
  try {
    const employees = await User.find({ role: "employee" })
      .select("employeeId name email createdAt")
      .sort({ employeeId: 1 })
      .lean();
    return response.json({
      employees: employees.map((employee) => ({
        id: String(employee._id),
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        createdAt: employee.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

export async function todayAttendance(_request, response, next) {
  try {
    return response.json(await attendanceForDate(indiaDateKey(new Date())));
  } catch (error) {
    return next(error);
  }
}

export async function attendanceHistory(request, response, next) {
  try {
    const date = request.query.date ?? indiaDateKey(new Date());
    if (!isValidDateKey(date)) {
      return response
        .status(400)
        .json({ error: "Date must be a valid YYYY-MM-DD value." });
    }
    return response.json(await attendanceForDate(date));
  } catch (error) {
    return next(error);
  }
}
