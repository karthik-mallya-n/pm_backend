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
exports.getProjectMembers = exports.removeProjectMember = exports.addProjectMember = exports.deleteProject = exports.updateProject = exports.getProjectById = exports.getUserProjects = exports.createProject = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
// Create a new project
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description, key } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Ensure key is unique
        const existingProject = yield db_1.default.project.findUnique({
            where: { key },
        });
        if (existingProject) {
            return res.status(400).json({ message: 'Project key already exists' });
        }
        // Create project and add user as owner in a transaction
        const project = yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const newProject = yield tx.project.create({
                data: {
                    name,
                    description,
                    key: key.toUpperCase(),
                },
            });
            // Add current user as project owner
            yield tx.projectMember.create({
                data: {
                    userId,
                    projectId: newProject.id,
                    role: client_1.ProjectRole.OWNER,
                },
            });
            // Log activity
            yield tx.activity.create({
                data: {
                    activityType: 'PROJECT_CREATED',
                    description: `Project "${name}" created`,
                    userId,
                },
            });
            return newProject;
        }));
        res.status(201).json(project);
    }
    catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Failed to create project' });
    }
});
exports.createProject = createProject;
// Get all projects that the user is a member of
const getUserProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const projects = yield db_1.default.project.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                _count: {
                    select: {
                        tickets: true,
                        members: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        res.json(projects);
    }
    catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ message: 'Failed to get projects' });
    }
});
exports.getUserProjects = getUserProjects;
// Get a single project by ID with detailed information
const getProjectById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Check if user is a member of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: id,
                },
            },
        });
        if (!projectMember) {
            return res.status(403).json({ message: 'Access denied to this project' });
        }
        const project = yield db_1.default.project.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        tickets: true,
                    },
                },
            },
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.json(project);
    }
    catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ message: 'Failed to get project details' });
    }
});
exports.getProjectById = getProjectById;
// Update a project
const updateProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Check if user is an admin or owner of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: id,
                },
            },
        });
        if (!projectMember || projectMember.role !== client_1.ProjectRole.OWNER) {
            return res.status(403).json({
                message: 'Only project owners can update project details'
            });
        }
        const updatedProject = yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const project = yield tx.project.update({
                where: { id },
                data: {
                    name,
                    description,
                },
            });
            // Log activity
            yield tx.activity.create({
                data: {
                    activityType: 'PROJECT_UPDATED',
                    description: `Project "${name}" updated`,
                    userId,
                },
            });
            return project;
        }));
        res.json(updatedProject);
    }
    catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ message: 'Failed to update project' });
    }
});
exports.updateProject = updateProject;
// Delete a project
const deleteProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Check if user is the owner of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: id,
                },
            },
        });
        if (!projectMember || projectMember.role !== client_1.ProjectRole.OWNER) {
            return res.status(403).json({
                message: 'Only project owners can delete projects'
            });
        }
        // First get project name for the activity log
        const project = yield db_1.default.project.findUnique({
            where: { id },
            select: { name: true }
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        // Delete the project - will cascade delete members and tickets due to Prisma schema
        yield db_1.default.project.delete({
            where: { id },
        });
        // Log activity independently since project is already deleted
        yield db_1.default.activity.create({
            data: {
                activityType: 'PROJECT_UPDATED',
                description: `Project "${project.name}" was deleted`,
                userId,
            },
        });
        res.json({ message: 'Project successfully deleted' });
    }
    catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ message: 'Failed to delete project' });
    }
});
exports.deleteProject = deleteProject;
// Add a user to a project
const addProjectMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { email, role } = req.body;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({ message: 'Authentication required' });
        } // Check if current user is project owner
        const currentMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: currentUserId,
                    projectId: id,
                },
            },
        });
        if (!currentMember || currentMember.role !== client_1.ProjectRole.OWNER) {
            return res.status(403).json({
                message: 'Only project owners can add members'
            });
        }
        // Find user by email
        const userToAdd = yield db_1.default.user.findUnique({
            where: { email },
            select: { id: true, name: true },
        });
        if (!userToAdd) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if user is already a member
        const existingMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: userToAdd.id,
                    projectId: id,
                },
            },
        });
        if (existingMember) {
            return res.status(400).json({ message: 'User is already a member of this project' });
        }
        // Add user to project
        const projectMember = yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const newMember = yield tx.projectMember.create({
                data: {
                    userId: userToAdd.id,
                    projectId: id,
                    role: role,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                },
            }); // Log activity
            yield tx.activity.create({
                data: {
                    activityType: 'USER_JOINED',
                    description: `${userToAdd.name} was added to the project as ${role}`,
                    userId: currentUserId,
                    // Note: projectId is not a field in Activity model
                    // Store project info in metadata instead
                    metadata: { projectId: id },
                },
            });
            return newMember;
        }));
        res.status(201).json(projectMember);
    }
    catch (error) {
        console.error('Add project member error:', error);
        res.status(500).json({ message: 'Failed to add member to project' });
    }
});
exports.addProjectMember = addProjectMember;
// Remove a user from a project
const removeProjectMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id, userId } = req.params;
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Check if current user is admin or owner
        const currentMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: currentUserId,
                    projectId: id,
                },
            },
        });
        if (!currentMember || currentMember.role !== client_1.ProjectRole.OWNER) {
            return res.status(403).json({
                message: 'Only project owners can remove members'
            });
        }
        // Get user to be removed
        const memberToRemove = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: id,
                },
            },
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        if (!memberToRemove) {
            return res.status(404).json({ message: 'User is not a member of this project' });
        }
        // Prevent removing the owner
        if (memberToRemove.role === client_1.ProjectRole.OWNER) {
            return res.status(400).json({ message: 'Cannot remove the project owner' });
        }
        // Remove user from project
        yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.projectMember.delete({
                where: {
                    userId_projectId: {
                        userId,
                        projectId: id,
                    },
                },
            }); // Log activity
            yield tx.activity.create({
                data: {
                    activityType: 'USER_JOINED',
                    description: `${memberToRemove.user.name} was removed from the project`,
                    userId: currentUserId,
                    // Note: projectId is not a field in Activity model
                    // Store project info in metadata instead
                    metadata: { projectId: id },
                },
            });
        }));
        res.json({ message: 'Member successfully removed from project' });
    }
    catch (error) {
        console.error('Remove project member error:', error);
        res.status(500).json({ message: 'Failed to remove member from project' });
    }
});
exports.removeProjectMember = removeProjectMember;
// Get members of a project
const getProjectMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Check if user is a member of the project
        const projectMember = yield db_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: id,
                },
            },
        });
        if (!projectMember) {
            return res.status(403).json({ message: 'Access denied to this project' });
        }
        // Get project members
        const members = yield db_1.default.projectMember.findMany({
            where: {
                projectId: id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });
        // Format the member data
        const formattedMembers = members.map(member => ({
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatar,
            role: member.role,
        }));
        res.json(formattedMembers);
    }
    catch (error) {
        console.error('Get project members error:', error);
        res.status(500).json({ message: 'Failed to get project members' });
    }
});
exports.getProjectMembers = getProjectMembers;
