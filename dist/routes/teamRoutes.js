"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const teamController_1 = require("../controllers/teamController");
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const expressUtils_1 = require("../utils/expressUtils");
const router = (0, express_1.Router)();
// Apply authentication middleware to all team routes
router.use('/', auth_1.authenticate);
// Send team invitation
router.post('/invite', (0, validation_1.validate)([
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Valid email is required'),
]), (0, expressUtils_1.asyncHandler)(teamController_1.inviteTeamMember));
// Accept team invitation
router.post('/invite/:token/accept', (0, expressUtils_1.asyncHandler)(teamController_1.acceptTeamInvitation));
// Decline team invitation
router.post('/invite/:token/decline', (0, expressUtils_1.asyncHandler)(teamController_1.declineTeamInvitation));
// Get team invitations sent by current user
router.get('/invitations', (0, expressUtils_1.asyncHandler)(teamController_1.getTeamInvitations));
// Get pending invitations for current user
router.get('/invitations/pending', (0, expressUtils_1.asyncHandler)(teamController_1.getPendingInvitations));
exports.default = router;
