import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createProject, 
  getUserProjects, 
  getProjectById, 
  updateProject, 
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers
} from '../controllers/projectController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/expressUtils';

const router = Router();

// Apply authentication middleware to all project routes
router.use('/', authenticate);

// Create a new project
router.post(
  '/',
  validate([
    body('name').notEmpty().withMessage('Project name is required'),
    body('key')
      .notEmpty()
      .withMessage('Project key is required')
      .isLength({ min: 2, max: 10 })
      .withMessage('Project key must be between 2 and 10 characters')
      .matches(/^[A-Z0-9]+$/)
      .withMessage('Project key must contain only uppercase letters and numbers'),
  ]),
  asyncHandler(createProject)
);

// Get all projects the user is a member of
router.get('/', asyncHandler(getUserProjects));

// Get a single project by ID
router.get('/:id', asyncHandler(getProjectById));

// Update a project
router.put(
  '/:id',
  validate([body('name').notEmpty().withMessage('Project name is required')]),
  asyncHandler(updateProject)
);

// Delete a project
router.delete('/:id', asyncHandler(deleteProject));

// Add a member to a project
router.post(
  '/:id/members',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('role')
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['ADMIN', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role'),
  ]),
  asyncHandler(addProjectMember)
);

// Remove a member from a project
router.delete('/:id/members/:userId', asyncHandler(removeProjectMember));

// Get members of a project
router.get('/:id/members', asyncHandler(getProjectMembers));

export default router;
