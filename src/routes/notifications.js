import express from 'express';
import { protect } from './authMiddleware.js';

const router = express.Router();

// GET /api/notifications/me - Get notifications for the current user
// We use the 'protect' middleware to ensure only authenticated users can access this.
router.get('/me', protect, (req, res) => {
  // In the future, you would fetch notifications from your database for req.user.id
  res.status(200).json([]); // Sending an empty array directly
});

export default router;