import { Router } from 'express';
import { punchIn, today } from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate, authorize('employee'));
router.get('/today', today);
router.post('/punch-in', punchIn);

export default router;
