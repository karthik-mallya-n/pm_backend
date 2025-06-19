"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const ticketController_1 = require("../controllers/ticketController");
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const expressUtils_1 = require("../utils/expressUtils");
const router = (0, express_1.Router)();
// Apply authentication middleware to all ticket routes
router.use('/', auth_1.authenticate);
// Get all tickets for the user (must come before more specific routes)
router.get('/', (0, expressUtils_1.asyncHandler)(ticketController_1.getAllTickets));
// Create a new ticket
router.post('/', (0, validation_1.validate)([
    (0, express_validator_1.body)('title').notEmpty().withMessage('Title is required'),
    (0, express_validator_1.body)('projectId').notEmpty().withMessage('Project ID is required'),
    (0, express_validator_1.body)('type').optional().isIn(['BUG', 'FEATURE', 'TASK', 'IMPROVEMENT']),
    (0, express_validator_1.body)('priority').optional().isIn(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']),
    (0, express_validator_1.body)('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
]), (0, expressUtils_1.asyncHandler)(ticketController_1.createTicket));
// Get all labels (this needs to be before /:id to prevent path conflicts)
router.get('/labels', (0, expressUtils_1.asyncHandler)(ticketController_1.getLabels));
// Get all tickets for a project
router.get('/project/:projectId', (0, expressUtils_1.asyncHandler)(ticketController_1.getProjectTickets));
// Get a ticket by ID
router.get('/:id', (0, expressUtils_1.asyncHandler)(ticketController_1.getTicketById));
// Update a ticket
router.put('/:id', (0, validation_1.validate)([
    (0, express_validator_1.body)('title').optional().notEmpty().withMessage('Title cannot be empty'),
    (0, express_validator_1.body)('type').optional().isIn(['BUG', 'FEATURE', 'TASK', 'IMPROVEMENT']),
    (0, express_validator_1.body)('priority').optional().isIn(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']),
    (0, express_validator_1.body)('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
]), (0, expressUtils_1.asyncHandler)(ticketController_1.updateTicket));
// Update ticket status
router.patch('/:id/status', (0, validation_1.validate)([
    (0, express_validator_1.body)('status').isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).withMessage('Valid status is required'),
]), (0, expressUtils_1.asyncHandler)(ticketController_1.updateTicketStatus));
// Delete a ticket
router.delete('/:id', (0, expressUtils_1.asyncHandler)(ticketController_1.deleteTicket));
// Add a comment to a ticket
router.post('/:id/comments', (0, validation_1.validate)([(0, express_validator_1.body)('content').notEmpty().withMessage('Comment content is required')]), (0, expressUtils_1.asyncHandler)(ticketController_1.addComment));
// Get all comments for a ticket
router.get('/:id/comments', (0, expressUtils_1.asyncHandler)(ticketController_1.getTicketComments));
// Create a new label
router.post('/labels', (0, validation_1.validate)([
    (0, express_validator_1.body)('name').notEmpty().withMessage('Label name is required'),
    (0, express_validator_1.body)('color')
        .notEmpty()
        .withMessage('Color is required')
        .matches(/^#[0-9a-fA-F]{6}$/)
        .withMessage('Color must be a valid hex color'),
]), (0, expressUtils_1.asyncHandler)(ticketController_1.createLabel));
exports.default = router;
