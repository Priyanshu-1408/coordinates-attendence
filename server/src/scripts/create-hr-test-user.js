import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';

const hrUser = {
  name: 'Test HR',
  employeeId: 'HR001',
  email: 'priyanshu.official.1408@gmail.com',
  role: 'hr',
};

async function createHrTestUser() {
  const password = process.env.HR_INITIAL_PASSWORD;
  if (!password) {
    throw new Error('HR_INITIAL_PASSWORD is required in the environment.');
  }
  if (password.length < 8) {
    throw new Error('HR_INITIAL_PASSWORD must be at least 8 characters.');
  }
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not configured. Add it to server/.env.');
  }

  await mongoose.connect(env.mongoUri);
  const existing = await User.findOne({
    $or: [{ email: hrUser.email }, { employeeId: hrUser.employeeId }],
  }).select('email employeeId');

  if (existing) {
    if (existing.email === hrUser.email && existing.employeeId === hrUser.employeeId) {
      console.log('Test HR account already exists; no changes made.');
      return;
    }
    throw new Error('The HR email or employee ID is already in use by another account.');
  }

  await User.create({ ...hrUser, password });
  console.log('Test HR account created successfully.');
}

try {
  await createHrTestUser();
} catch (error) {
  console.error('Could not create the test HR account:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
