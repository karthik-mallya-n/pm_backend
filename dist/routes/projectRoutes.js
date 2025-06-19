"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const projectController_1 = require("../controllers/projectController");
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const expressUtils_1 = require("../utils/expressUtils");
const router = (0, express_1.Router)();
// Apply authentication middleware to all project routes
router.use('/', auth_1.authenticate);
// Create a new project
router.post('/', (0, validation_1.validate)([
    (0, express_validator_1.body)('name').notEmpty().withMessage('Project name is required'),
    (0, express_validator_1.body)('key')
        .notEmpty()
        .withMessage('Project key is required')
        .isLength({ min: 2, max: 10 })
        .withMessage('Project key must be between 2 and 10 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Project key must contain only uppercase letters and numbers'),
]), (0, expressUtils_1.asyncHandler)(projectController_1.createProject));
// Get all projects the user is a member of
router.get('/', (0, expressUtils_1.asyncHandler)(projectController_1.getUserProjects));
// Get a single project by ID
router.get('/:id', (0, expressUtils_1.asyncHandler)(projectController_1.getProjectById));
// Update a project
router.put('/:id', (0, validation_1.validate)([(0, express_validator_1.body)('name').notEmpty().withMessage('Project name is required')]), (0, expressUtils_1.asyncHandler)(projectController_1.updateProject));
// Delete a project
router.delete('/:id', (0, expressUtils_1.asyncHandler)(projectController_1.deleteProject));
// Add a member to a project
router.post('/:id/members', (0, validation_1.validate)([
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['ADMIN', 'MEMBER', 'VIEWER'])
        .withMessage('Invalid role'),
]), (0, expressUtils_1.asyncHandler)(projectController_1.addProjectMember));
// Remove a member from a project
router.delete('/:id/members/:userId', (0, expressUtils_1.asyncHandler)(projectController_1.removeProjectMember));
// Get members of a project
router.get('/:id/members', (0, expressUtils_1.asyncHandler)(projectController_1.getProjectMembers));
exports.default = router;
