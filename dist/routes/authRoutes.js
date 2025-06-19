"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const expressUtils_1 = require("../utils/expressUtils");
const router = (0, express_1.Router)();
// Register a new user
router.post('/register', (0, validation_1.validate)([
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
]), (0, expressUtils_1.asyncHandler)(authController_1.register));
// Login
router.post('/login', (0, validation_1.validate)([
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
]), (0, expressUtils_1.asyncHandler)(authController_1.login));
// Get current user
router.get('/me', auth_1.authenticate, (0, expressUtils_1.asyncHandler)(authController_1.getCurrentUser));
exports.default = router;
