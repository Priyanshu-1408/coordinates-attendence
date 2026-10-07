import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import hrRoutes from './routes/hr.routes.js';

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/hr', hrRoutes);

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

export default app;
