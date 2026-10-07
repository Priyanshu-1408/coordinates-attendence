import { Router } from 'express';
import { attendanceHistory, listEmployees, todayAttendance } from '../controllers/hr.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate, authorize('hr'));
router.get('/employees', listEmployees);
router.get('/attendance/today', todayAttendance);
router.get('/attendance/history', attendanceHistory);

export default router;
