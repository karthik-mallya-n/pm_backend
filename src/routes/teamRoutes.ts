import { Router } from 'express';
import { body } from 'express-validator';
import { 
  inviteTeamMember,
  acceptTeamInvitation,
  declineTeamInvitation,
  getTeamInvitations,
  getPendingInvitations
} from '../controllers/teamController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/expressUtils';

const router = Router();

// Apply authentication middleware to all team routes
router.use('/', authenticate);

// Send team invitation
router.post(
  '/invite',
  validate([
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
  ]),
  asyncHandler(inviteTeamMember)
);

// Accept team invitation
router.post('/invite/:token/accept', asyncHandler(acceptTeamInvitation));

// Decline team invitation
router.post('/invite/:token/decline', asyncHandler(declineTeamInvitation));

// Get team invitations sent by current user
router.get('/invitations', asyncHandler(getTeamInvitations));

// Get pending invitations for current user
router.get('/invitations/pending', asyncHandler(getPendingInvitations));

export default router;
