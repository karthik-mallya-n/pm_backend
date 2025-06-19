import { Router } from 'express';
import { body } from 'express-validator';
import {
  getUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  getUserStats,
  getUserActivities,
  inviteUser,
} from '../controllers/userController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/expressUtils';

const router = Router();

// Apply authentication middleware to all user routes
router.use('/', authenticate);

// Get all users (available to all authenticated users)
router.get('/', asyncHandler(getUsers));

// Get user by ID
router.get('/:id', asyncHandler(getUserById));

// Update user
router.put(
  '/:id',
  validate([
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Must be a valid email'),
  ]),
  asyncHandler(updateUser)
);

// Change password
router.post(
  '/change-password',
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ]),
  asyncHandler(changePassword)
);

// Delete user - restricted route, commented out since we removed admin role
// router.delete('/:id', asyncHandler(deleteUser));

// Get user stats
router.get('/stats', asyncHandler(getUserStats));

// Get user activities
router.get('/activities', asyncHandler(getUserActivities));

// Invite a new user (manager only)
router.post(
  '/invite',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(['MANAGER', 'MEMBER']).withMessage('Invalid role'),
  ]),
  asyncHandler(inviteUser)
);

export default router;
