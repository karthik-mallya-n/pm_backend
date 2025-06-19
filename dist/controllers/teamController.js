"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingInvitations = exports.getTeamInvitations = exports.declineTeamInvitation = exports.acceptTeamInvitation = exports.inviteTeamMember = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma = new client_1.PrismaClient();
// Define invitation status enum
var InvitationStatus;
(function (InvitationStatus) {
    InvitationStatus["PENDING"] = "PENDING";
    InvitationStatus["ACCEPTED"] = "ACCEPTED";
    InvitationStatus["DECLINED"] = "DECLINED";
    InvitationStatus["EXPIRED"] = "EXPIRED";
})(InvitationStatus || (InvitationStatus = {}));
// Send team invitation
const inviteTeamMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { email } = req.body;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Check if user exists
        const existingUser = yield prisma.user.findUnique({
            where: { email },
        });
        // Check if invitation already exists and is pending
        const existingInvitation = yield prisma.teamInvitation.findFirst({
            where: {
                email,
                invitedById: currentUserId,
                status: InvitationStatus.PENDING,
            },
        });
        if (existingInvitation) {
            return res.status(400).json({
                message: 'An invitation has already been sent to this email address'
            });
        }
        // Generate invitation token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        // Create invitation
        const invitation = yield prisma.teamInvitation.create({
            data: {
                email,
                invitedById: currentUserId,
                invitedUserId: existingUser === null || existingUser === void 0 ? void 0 : existingUser.id,
                token,
                expiresAt,
            },
            include: {
                invitedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        }); // Send invitation email (optional - gracefully handle missing config)
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                yield sendInvitationEmail(email, invitation.invitedBy.name, token);
            }
            else {
                console.log('Email configuration not found. Invitation created but email not sent.');
                console.log(`Invitation URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${token}`);
            }
        }
        catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
            // Don't fail the request if email sending fails
        }
        res.status(201).json({
            message: 'Team invitation sent successfully',
            invitation: {
                id: invitation.id,
                email: invitation.email,
                status: invitation.status,
                createdAt: invitation.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Error sending team invitation:', error);
        res.status(500).json({ message: 'Failed to send team invitation' });
    }
});
exports.inviteTeamMember = inviteTeamMember;
// Accept team invitation
const acceptTeamInvitation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { token } = req.params;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Find invitation
        const invitation = yield prisma.teamInvitation.findUnique({
            where: { token },
            include: {
                invitedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }
        if (invitation.status !== InvitationStatus.PENDING) {
            return res.status(400).json({ message: 'Invitation is no longer valid' });
        }
        if (invitation.expiresAt < new Date()) {
            yield prisma.teamInvitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.EXPIRED },
            });
            return res.status(400).json({ message: 'Invitation has expired' });
        }
        // Update invitation status
        yield prisma.teamInvitation.update({
            where: { id: invitation.id },
            data: {
                status: InvitationStatus.ACCEPTED,
                invitedUserId: currentUserId,
            },
        });
        // Create activity log
        yield prisma.activity.create({
            data: {
                activityType: 'USER_INVITE',
                description: `${invitation.invitedBy.name} invited a new team member`,
                userId: invitation.invitedById,
            },
        });
        res.json({
            message: 'Team invitation accepted successfully',
            invitedBy: invitation.invitedBy,
        });
    }
    catch (error) {
        console.error('Error accepting team invitation:', error);
        res.status(500).json({ message: 'Failed to accept team invitation' });
    }
});
exports.acceptTeamInvitation = acceptTeamInvitation;
// Decline team invitation
const declineTeamInvitation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        // Find invitation
        const invitation = yield prisma.teamInvitation.findUnique({
            where: { token },
        });
        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }
        if (invitation.status !== InvitationStatus.PENDING) {
            return res.status(400).json({ message: 'Invitation is no longer valid' });
        }
        // Update invitation status
        yield prisma.teamInvitation.update({
            where: { id: invitation.id },
            data: { status: InvitationStatus.DECLINED },
        });
        res.json({ message: 'Team invitation declined' });
    }
    catch (error) {
        console.error('Error declining team invitation:', error);
        res.status(500).json({ message: 'Failed to decline team invitation' });
    }
});
exports.declineTeamInvitation = declineTeamInvitation;
// Get team invitations sent by current user
const getTeamInvitations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const invitations = yield prisma.teamInvitation.findMany({
            where: { invitedById: currentUserId },
            include: {
                invitedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(invitations);
    }
    catch (error) {
        console.error('Error fetching team invitations:', error);
        res.status(500).json({ message: 'Failed to fetch team invitations' });
    }
});
exports.getTeamInvitations = getTeamInvitations;
// Get pending invitations for current user
const getPendingInvitations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const currentUser = req.user;
        if (!currentUserId || !currentUser) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const invitations = yield prisma.teamInvitation.findMany({
            where: {
                OR: [
                    { email: currentUser.email },
                    { invitedUserId: currentUserId },
                ],
                status: InvitationStatus.PENDING,
                expiresAt: { gt: new Date() },
            },
            include: {
                invitedBy: {
                    select: {
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(invitations);
    }
    catch (error) {
        console.error('Error fetching pending invitations:', error);
        res.status(500).json({ message: 'Failed to fetch pending invitations' });
    }
});
exports.getPendingInvitations = getPendingInvitations;
// Helper function to send invitation email
function sendInvitationEmail(email, inviterName, token) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if email configuration is available
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Email configuration not available');
        }
        // Configure your email transporter here
        const transporter = nodemailer_1.default.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${token}`;
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@labmentix.com',
            to: email,
            subject: `${inviterName} invited you to join their team on LabMentix`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">You're invited to join a team on LabMentix!</h2>
        <p><strong>${inviterName}</strong> has invited you to join their team.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" style="background-color: #3B82F6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p>Or copy and paste this link: ${invitationUrl}</p>
        <p>This invitation will expire in 7 days.</p>
      </div>`
        };
        yield transporter.sendMail(mailOptions);
    });
}
