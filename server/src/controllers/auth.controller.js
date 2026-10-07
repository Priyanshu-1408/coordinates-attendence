import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(user) {
  return jwt.sign({ sub: user.id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    employeeId: user.employeeId,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register(request, response, next) {
  try {
    const { name, employeeId, email, password } = request.body ?? {};
    // Self-service registration is employee-only; HR accounts must be provisioned separately.
    const role = "employee";
    const errors = [];
    if (typeof name !== "string" || !name.trim())
      errors.push("Name is required");
    if (typeof employeeId !== "string" || !employeeId.trim())
      errors.push("Employee ID is required");
    if (typeof email !== "string" || !email.trim())
      errors.push("Email is required");
    else if (!emailPattern.test(email.trim()))
      errors.push("Enter a valid email address");
    if (typeof password !== "string" || !password)
      errors.push("Password is required");
    else if (password.length < 8)
      errors.push("Password must be at least 8 characters");
    if (errors.length)
      return response
        .status(400)
        .json({ error: "Validation failed", details: errors });

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim().toUpperCase();
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { employeeId: normalizedEmployeeId }],
    });
    if (existing) {
      const field =
        existing.email === normalizedEmail ? "Email" : "Employee ID";
      return response
        .status(409)
        .json({ error: `${field} is already registered` });
    }

    const user = await User.create({
      name: name.trim(),
      employeeId: normalizedEmployeeId,
      email: normalizedEmail,
      password,
      role,
    });
    return response
      .status(201)
      .json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000)
      return response
        .status(409)
        .json({ error: "Email or employee ID is already registered" });
    if (error.name === "ValidationError")
      return response.status(400).json({ error: "Validation failed" });
    return next(error);
  }
}

export async function login(request, response, next) {
  try {
    const { email, password } = request.body ?? {};
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return response
        .status(400)
        .json({ error: "Email and password are required" });
    }
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return response.status(401).json({ error: "Invalid email or password" });
    }
    return response.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

export function me(request, response) {
  return response.json({ user: publicUser(request.user) });
}
