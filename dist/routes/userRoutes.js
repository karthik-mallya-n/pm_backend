"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const expressUtils_1 = require("../utils/expressUtils");
const router = (0, express_1.Router)();
// Apply authentication middleware to all user routes
router.use('/', auth_1.authenticate);
// Get all users (available to all authenticated users)
router.get('/', (0, expressUtils_1.asyncHandler)(userController_1.getUsers));
// Get user by ID
router.get('/:id', (0, expressUtils_1.asyncHandler)(userController_1.getUserById));
// Update user
router.put('/:id', (0, validation_1.validate)([
    (0, express_validator_1.body)('name').optional().notEmpty().withMessage('Name cannot be empty'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Must be a valid email'),
]), (0, expressUtils_1.asyncHandler)(userController_1.updateUser));
// Change password
router.post('/change-password', (0, validation_1.validate)([
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters'),
]), (0, expressUtils_1.asyncHandler)(userController_1.changePassword));
// Delete user (admin only)
router.delete('/:id', auth_1.isAdmin, (0, expressUtils_1.asyncHandler)(userController_1.deleteUser));
// Get user stats
router.get('/stats', (0, expressUtils_1.asyncHandler)(userController_1.getUserStats));
// Get user activities
router.get('/activities', (0, expressUtils_1.asyncHandler)(userController_1.getUserActivities));
// Invite a new user (admin and manager only)
router.post('/invite', (0, validation_1.validate)([
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('role').optional().isIn(['ADMIN', 'MANAGER', 'MEMBER']).withMessage('Invalid role'),
]), (0, expressUtils_1.asyncHandler)(userController_1.inviteUser));
exports.default = router;
