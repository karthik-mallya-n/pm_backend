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
exports.updateTicketStatus = exports.getTicketComments = exports.getAllTickets = exports.createLabel = exports.getLabels = exports.addComment = exports.deleteTicket = exports.updateTicket = exports.getTicketById = exports.getProjectTickets = exports.createTicket = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
// Create a new ticket
const createTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, description, projectId, assigneeId, status, priority, type, dueDate, estimatedHours, labels } = req.body;
        const reporterId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!reporterId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        } // Check if user is a member of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: reporterId,
                    projectId,
                },
            },
        });
        if (!projectMember) {
            res.status(403).json({ message: 'Access denied to this project' });
            return;
        }
        // If assigneeId is provided, verify they are a project member
        if (assigneeId) {
            const assigneeMember = yield db_1.default.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: assigneeId,
                        projectId,
                    },
                },
            });
            if (!assigneeMember) {
                res.status(400).json({
                    message: 'Assignee is not a member of this project'
                });
                return;
            }
        }
        // Create ticket in a transaction
        const ticket = yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create the ticket
            const newTicket = yield tx.ticket.create({
                data: Object.assign({ title,
                    description,
                    projectId,
                    reporterId,
                    assigneeId, status: status || client_1.TicketStatus.TODO, priority: priority || client_1.Priority.MEDIUM, type: type || client_1.TicketType.BUG, dueDate: dueDate ? new Date(dueDate) : undefined, estimatedHours }, (labels && labels.length > 0 && {
                    labels: {
                        connect: labels.map((labelId) => ({ id: labelId })),
                    },
                })),
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    labels: true,
                },
            });
            // Create activity record
            yield tx.activity.create({
                data: {
                    activityType: 'TICKET_CREATED',
                    description: `Ticket "${title}" was created`,
                    ticketId: newTicket.id,
                    userId: reporterId,
                },
            });
            return newTicket;
        }));
        res.status(201).json(ticket);
    }
    catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ message: 'Failed to create ticket' });
    }
});
exports.createTicket = createTicket;
// Get all tickets for a project
const getProjectTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { projectId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { status, priority, type, assigneeId, reporterId, labelId, search } = req.query;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Check if user is a member of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        });
        if (!projectMember) {
            return res.status(403).json({ message: 'Access denied to this project' });
        }
        // Build where clause for filters
        const where = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ projectId }, (status && { status: status })), (priority && { priority: priority })), (type && { type: type })), (assigneeId && { assigneeId: assigneeId })), (reporterId && { reporterId: reporterId })), (labelId && {
            labels: {
                some: { id: labelId }
            }
        })), (search && {
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ],
        }));
        const tickets = yield db_1.default.ticket.findMany({
            where,
            include: {
                reporter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                labels: true,
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        res.json(tickets);
    }
    catch (error) {
        console.error('Get project tickets error:', error);
        res.status(500).json({ message: 'Failed to get tickets' });
    }
});
exports.getProjectTickets = getProjectTickets;
// Get a single ticket by ID
const getTicketById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Get ticket with project information
        const ticket = yield db_1.default.ticket.findUnique({
            where: { id },
            include: {
                project: true,
                reporter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
                labels: true,
                activities: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        // Check if user is a member of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: ticket.projectId,
                },
            },
        });
        if (!projectMember) {
            return res.status(403).json({ message: 'Access denied to this ticket' });
        }
        res.json(ticket);
    }
    catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ message: 'Failed to get ticket details' });
    }
});
exports.getTicketById = getTicketById;
// Update a ticket
const updateTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const { title, description, status, priority, type, assigneeId, dueDate, estimatedHours, labels, } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Get the ticket to check permissions and track changes
        const ticket = yield db_1.default.ticket.findUnique({
            where: { id },
            include: {
                project: true,
                labels: true,
            },
        });
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        // Check if user is a member of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: ticket.projectId,
                },
            },
        });
        if (!projectMember) {
            return res.status(403).json({ message: 'Access denied to this ticket' });
        }
        // If assigneeId is provided, verify they are a project member
        if (assigneeId && assigneeId !== ticket.assigneeId) {
            const assigneeMember = yield db_1.default.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: assigneeId,
                        projectId: ticket.projectId,
                    },
                },
            });
            if (!assigneeMember) {
                return res.status(400).json({
                    message: 'Assignee is not a member of this project'
                });
            }
        }
        // Track changes for activity log
        const changes = [];
        if (title && title !== ticket.title)
            changes.push(`title changed to "${title}"`);
        if (status && status !== ticket.status)
            changes.push(`status changed to ${status}`);
        if (priority && priority !== ticket.priority)
            changes.push(`priority changed to ${priority}`);
        if (type && type !== ticket.type)
            changes.push(`type changed to ${type}`);
        if (assigneeId && assigneeId !== ticket.assigneeId)
            changes.push(`assignee changed`);
        if (dueDate && new Date(dueDate).toISOString() !== ((_b = ticket.dueDate) === null || _b === void 0 ? void 0 : _b.toISOString()))
            changes.push(`due date changed`);
        // Update ticket in a transaction
        const updatedTicket = yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // Update the ticket
            const updated = yield tx.ticket.update({
                where: { id },
                data: Object.assign({ title,
                    description, status: status, priority: priority, type: type, assigneeId, dueDate: dueDate ? new Date(dueDate) : ticket.dueDate, estimatedHours }, (labels && {
                    labels: {
                        set: labels.map((labelId) => ({ id: labelId })),
                    },
                })),
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    labels: true,
                },
            });
            // If there were changes, log the activity
            if (changes.length > 0) {
                yield tx.activity.create({
                    data: {
                        activityType: 'TICKET_UPDATED',
                        description: changes.join(', '),
                        ticketId: id,
                        userId,
                        metadata: {
                            changes
                        },
                    },
                });
            }
            // If status changed, log specific activity
            if (status && status !== ticket.status) {
                yield tx.activity.create({
                    data: {
                        activityType: 'TICKET_MOVED',
                        description: `Ticket moved to ${status}`,
                        ticketId: id,
                        userId,
                    },
                });
            }
            // If assignee changed, log specific activity
            if (assigneeId && assigneeId !== ticket.assigneeId) {
                yield tx.activity.create({
                    data: {
                        activityType: 'TICKET_ASSIGNED',
                        description: `Ticket assigned to ${((_a = updated.assignee) === null || _a === void 0 ? void 0 : _a.name) || 'someone'}`,
                        ticketId: id,
                        userId,
                    },
                });
            }
            return updated;
        }));
        res.json(updatedTicket);
    }
    catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ message: 'Failed to update ticket' });
    }
});
exports.updateTicket = updateTicket;
// Delete a ticket
const deleteTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Get the ticket
        const ticket = yield db_1.default.ticket.findUnique({
            where: { id },
            include: {
                project: true,
            },
        });
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        // Check if user is a project admin/owner or the reporter of the ticket
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: ticket.projectId,
                },
            },
        });
        const canDelete = userId === ticket.reporterId ||
            (projectMember === null || projectMember === void 0 ? void 0 : projectMember.role) === client_1.ProjectRole.OWNER;
        if (!projectMember || !canDelete) {
            return res.status(403).json({
                message: 'You do not have permission to delete this ticket'
            });
        }
        // Delete the ticket
        yield db_1.default.ticket.delete({
            where: { id },
        });
        res.json({ message: 'Ticket successfully deleted' });
    }
    catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({ message: 'Failed to delete ticket' });
    }
});
exports.deleteTicket = deleteTicket;
// Add a comment to a ticket
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { content } = req.body;
        const authorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!authorId) {
            return res.status(401).json({ message: 'Authentication required' });
        } // Get the ticket to check project membership
        const ticket = yield db_1.default.ticket.findUnique({
            where: { id },
            select: { projectId: true },
        });
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        // Check if user is a member of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: authorId,
                    projectId: ticket.projectId,
                },
            },
        });
        if (!projectMember) {
            return res.status(403).json({ message: 'Access denied to this ticket' });
        }
        // Add comment in transaction
        const comment = yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const newComment = yield tx.comment.create({ data: {
                    content,
                    ticketId: id,
                    authorId,
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                },
            });
            // Create activity record
            yield tx.activity.create({
                data: { activityType: 'TICKET_COMMENTED',
                    description: 'Comment added',
                    ticketId: id,
                    userId: authorId,
                },
            });
            return newComment;
        }));
        res.status(201).json(comment);
    }
    catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});
exports.addComment = addComment;
// Get all labels
const getLabels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const labels = yield db_1.default.label.findMany({
            orderBy: {
                name: 'asc',
            },
        });
        res.json(labels);
    }
    catch (error) {
        console.error('Get labels error:', error);
        res.status(500).json({ message: 'Failed to get labels' });
    }
});
exports.getLabels = getLabels;
// Create a new label
const createLabel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, color } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const label = yield db_1.default.label.create({
            data: {
                name,
                color,
            },
        });
        res.status(201).json(label);
    }
    catch (error) {
        console.error('Create label error:', error);
        res.status(500).json({ message: 'Failed to create label' });
    }
});
exports.createLabel = createLabel;
// Get all tickets accessible to the current user
const getAllTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        // Get all projects that the user is a member of
        const userProjects = yield db_1.default.projectMember.findMany({
            where: {
                userId,
            },
            select: {
                projectId: true,
            },
        });
        const projectIds = userProjects.map((project) => project.projectId);
        // Get all tickets from projects the user is a member of
        const tickets = yield db_1.default.ticket.findMany({
            where: {
                projectId: {
                    in: projectIds,
                },
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        key: true,
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                reporter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                labels: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        res.json(tickets);
    }
    catch (error) {
        console.error('Get all tickets error:', error);
        res.status(500).json({ message: 'Failed to get tickets' });
    }
});
exports.getAllTickets = getAllTickets;
// Get all comments for a specific ticket
const getTicketComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Get the ticket to check project membership
        const ticket = yield db_1.default.ticket.findUnique({
            where: { id },
            select: { projectId: true },
        });
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        // Check if user is a member of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: ticket.projectId,
                },
            },
        });
        if (!projectMember) {
            return res.status(403).json({ message: 'Access denied to this ticket' });
        }
        // Fetch all comments for this ticket
        const comments = yield db_1.default.comment.findMany({
            where: {
                ticketId: id,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        // Format comments for the frontend
        const formattedComments = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            authorId: comment.authorId,
            authorName: comment.author.name,
            authorAvatar: comment.author.avatar,
            createdAt: comment.createdAt.toISOString(),
        }));
        res.json(formattedComments);
    }
    catch (error) {
        console.error('Error fetching ticket comments:', error);
        res.status(500).json({ message: 'Failed to fetch comments' });
    }
});
exports.getTicketComments = getTicketComments;
// Update ticket status
const updateTicketStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        // Validate status
        if (!Object.values(client_1.TicketStatus).includes(status)) {
            res.status(400).json({ message: 'Invalid status value' });
            return;
        }
        // Get ticket to check project membership and current status
        const ticket = yield db_1.default.ticket.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        members: {
                            where: { userId },
                            select: { role: true },
                        },
                    },
                },
            },
        });
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        // Check if user is a project member
        if (ticket.project.members.length === 0) {
            res.status(403).json({ message: 'You are not a member of this project' });
            return;
        }
        // No need to change if the status is the same
        if (ticket.status === status) {
            res.json(ticket);
            return;
        }
        // Update ticket status and log activity in a transaction
        const updatedTicket = yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update the ticket status
            const updated = yield tx.ticket.update({
                where: { id },
                data: { status },
                include: {
                    reporter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                    labels: true,
                },
            }); // Create activity log for status change
            yield tx.activity.create({
                data: {
                    userId,
                    ticketId: ticket.id,
                    activityType: 'TICKET_MOVED',
                    description: `changed ticket status from ${ticket.status} to ${status}`,
                },
            });
            return updated;
        }));
        res.json(updatedTicket);
    }
    catch (error) {
        console.error('Update ticket status error:', error);
        res.status(500).json({ message: 'Failed to update ticket status' });
    }
});
exports.updateTicketStatus = updateTicketStatus;
