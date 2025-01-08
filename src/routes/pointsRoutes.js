import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { getUserPoints, addPoints } from '../controllers/pointsController.js';

const router = express.Router();

router.get('/balance', authenticateToken, getUserPoints);
router.get('/user/:userId', authenticateToken, getUserPoints);
router.post('/add', authenticateToken, isAdmin, addPoints);

export default router; 