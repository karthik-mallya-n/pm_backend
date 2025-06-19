import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/expressUtils';

const router = Router();

// Register a new user
router.post(
  '/register',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ]),
  asyncHandler(register)
);

// Login
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  asyncHandler(login)
);

// Get current user
router.get('/me', authenticate, asyncHandler(getCurrentUser));

export default router;
