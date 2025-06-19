import { Router } from 'express';
import { body } from 'express-validator';
import {
  createTicket,
  getProjectTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  addComment,
  getTicketComments,
  getLabels,
  createLabel,
  getAllTickets,
  updateTicketStatus,
} from '../controllers/ticketController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/expressUtils';

const router = Router();

// Apply authentication middleware to all ticket routes
router.use('/', authenticate);

// Get all tickets for the user (must come before more specific routes)
router.get('/', asyncHandler(getAllTickets));

// Create a new ticket
router.post(
  '/',
  validate([
    body('title').notEmpty().withMessage('Title is required'),
    body('projectId').notEmpty().withMessage('Project ID is required'),
    body('type').optional().isIn(['BUG', 'FEATURE', 'TASK', 'IMPROVEMENT']),
    body('priority').optional().isIn(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
  ]),
  asyncHandler(createTicket)
);

// Get all labels (this needs to be before /:id to prevent path conflicts)
router.get('/labels', asyncHandler(getLabels));

// Get all tickets for a project
router.get('/project/:projectId', asyncHandler(getProjectTickets));

// Get a ticket by ID
router.get('/:id', asyncHandler(getTicketById));

// Update a ticket
router.put(
  '/:id',
  validate([
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('type').optional().isIn(['BUG', 'FEATURE', 'TASK', 'IMPROVEMENT']),
    body('priority').optional().isIn(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
  ]),
  asyncHandler(updateTicket)
);

// Update ticket status
router.patch(
  '/:id/status',
  validate([
    body('status').isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).withMessage('Valid status is required'),
  ]),
  asyncHandler(updateTicketStatus)
);

// Delete a ticket
router.delete('/:id', asyncHandler(deleteTicket));

// Add a comment to a ticket
router.post(
  '/:id/comments',
  validate([body('content').notEmpty().withMessage('Comment content is required')]),
  asyncHandler(addComment)
);

// Get all comments for a ticket
router.get('/:id/comments', asyncHandler(getTicketComments));

// Create a new label
router.post(
  '/labels',
  validate([
    body('name').notEmpty().withMessage('Label name is required'),
    body('color')
      .notEmpty()
      .withMessage('Color is required')
      .matches(/^#[0-9a-fA-F]{6}$/)
      .withMessage('Color must be a valid hex color'),
  ]),
  asyncHandler(createLabel)
);

export default router;
