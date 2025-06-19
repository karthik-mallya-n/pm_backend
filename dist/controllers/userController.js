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
exports.inviteUser = exports.getUserActivities = exports.getUserStats = exports.deleteUser = exports.changePassword = exports.updateUser = exports.getUserById = exports.getUsers = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
// Get all users
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = req.user;
        // For admin users, return all user data
        // For non-admin users, return limited data without emails for privacy
        const users = yield db_1.default.user.findMany({
            select: {
                id: true,
                email: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === client_1.Role.MANAGER, // Only include email for managers
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
        res.json(users);
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to get users' });
    }
});
exports.getUsers = getUsers;
// Get a user by ID
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield db_1.default.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
                createdAt: true,
                projects: {
                    include: {
                        project: true,
                    },
                },
                _count: {
                    select: {
                        assignedTickets: true,
                        reportedTickets: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to get user details' });
    }
});
exports.getUserById = getUserById;
// Update a user
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, avatar, role } = req.body;
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Only allow users to update their own profile (except for admins)
        if (id !== currentUser.id && currentUser.role !== client_1.Role.MANAGER) {
            return res.status(403).json({ message: 'Cannot update other users' });
        }
        // Only admins can change roles
        if (role && currentUser.role !== client_1.Role.MANAGER) {
            return res.status(403).json({ message: 'Only admins can change user roles' });
        }
        // If email is being changed, check for uniqueness
        if (email) {
            const existingUser = yield db_1.default.user.findUnique({
                where: { email },
            });
            if (existingUser && existingUser.id !== id) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }
        const updatedUser = yield db_1.default.user.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (email && { email })), (avatar && { avatar })), (role && { role })),
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatar: true,
            },
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
});
exports.updateUser = updateUser;
// Change user password
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Get user with password
        const user = yield db_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Verify current password
        const isPasswordValid = yield bcrypt_1.default.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        // Hash new password
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
        // Update password
        yield db_1.default.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to change password' });
    }
});
exports.changePassword = changePassword;
// Delete a user (admin only)
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Only admins can delete users
        if (currentUser.role !== client_1.Role.MANAGER) {
            return res.status(403).json({ message: 'Only admins can delete users' });
        }
        // Prevent deleting yourself
        if (id === currentUser.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        // Delete user
        yield db_1.default.user.delete({
            where: { id },
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});
exports.deleteUser = deleteUser;
// Get user stats (count of assigned tickets, completed tickets, and projects)
const getUserStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Get counts of assigned tickets, completed tickets, and projects
        const [assignedTicketsCount, completedTicketsCount, projectsCount] = yield Promise.all([
            // Total assigned tickets
            db_1.default.ticket.count({
                where: {
                    assigneeId: userId,
                },
            }),
            // Completed tickets
            db_1.default.ticket.count({
                where: {
                    assigneeId: userId,
                    status: 'DONE',
                },
            }),
            // Projects the user is a member of
            db_1.default.projectMember.count({
                where: {
                    userId,
                },
            }),
        ]);
        // Return stats
        res.json({
            assignedTickets: assignedTicketsCount,
            completedTickets: completedTicketsCount,
            projectCount: projectsCount,
        });
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ message: 'Failed to get user stats' });
    }
});
exports.getUserStats = getUserStats;
// Get user activities
const getUserActivities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        } // Get user activities
        const activities = yield db_1.default.activity.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 30, // Limit to 30 most recent activities
        });
        // Format activities for the frontend
        const formattedActivities = activities.map((activity) => {
            // Extract project and ticket data from metadata if available
            const metadata = activity.metadata;
            const projectName = metadata === null || metadata === void 0 ? void 0 : metadata.projectName;
            const ticketTitle = metadata === null || metadata === void 0 ? void 0 : metadata.ticketTitle;
            const activityData = {
                id: activity.id,
                type: activity.activityType,
                description: activity.description,
                createdAt: activity.createdAt.toISOString(),
                projectName,
                ticketTitle: activity.ticketId ? ticketTitle : undefined,
            };
            return activityData;
        });
        res.json(formattedActivities);
    }
    catch (error) {
        console.error('Get user activities error:', error);
        res.status(500).json({ message: 'Failed to get user activities' });
    }
});
exports.getUserActivities = getUserActivities;
// Invite a new user
const inviteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, role = 'MEMBER' } = req.body;
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Only admins and managers can invite users
        if (currentUser.role !== client_1.Role.MANAGER) {
            return res.status(403).json({ message: 'Only admins and managers can invite users' });
        }
        // Check if email already exists
        const existingUser = yield db_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        // Generate a temporary password
        const temporaryPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = yield bcrypt_1.default.hash(temporaryPassword, 10);
        // Create new user
        const newUser = yield db_1.default.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: role,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        }); // Create an activity for user invitation
        yield db_1.default.activity.create({
            data: {
                userId: currentUser.id,
                activityType: 'USER_INVITE', // Type cast to bypass TypeScript error
                description: `Invited ${name} (${email}) to join the team`,
                metadata: {
                    invitedUserId: newUser.id,
                    invitedUserEmail: email,
                    invitedUserName: name,
                    invitedUserRole: role,
                },
            },
        });
        // In a real application, you would send an email with the temporary password
        // For now, we'll just include it in the response (in production, never do this!)
        res.status(201).json({
            user: newUser,
            message: 'User invited successfully',
            temporaryPassword, // In a real app, remove this and send via email instead
        });
    }
    catch (error) {
        console.error('Invite user error:', error);
        res.status(500).json({ message: 'Failed to invite user' });
    }
});
exports.inviteUser = inviteUser;
