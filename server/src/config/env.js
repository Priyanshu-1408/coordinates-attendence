import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number.parseInt(process.env.PORT ?? '5000', 10),
  mongoUri: process.env.MONGODB_URI,
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  officeLatitude: Number.parseFloat(process.env.OFFICE_LATITUDE ?? ''),
  officeLongitude: Number.parseFloat(process.env.OFFICE_LONGITUDE ?? ''),
  officeRadiusMeters: Number.parseFloat(process.env.OFFICE_RADIUS_METERS ?? '100'),
  emailUser: process.env.EMAIL_USER,
  emailAppPassword: process.env.EMAIL_APP_PASSWORD,
  hrEmail: process.env.HR_EMAIL,
};
