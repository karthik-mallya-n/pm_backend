import { Request, Response } from 'express';
import prisma from '../config/db';
import { ProjectRole } from '@prisma/client';

// Create a new project
export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, key } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Ensure key is unique
    const existingProject = await prisma.project.findUnique({
      where: { key },
    });

    if (existingProject) {
      return res.status(400).json({ message: 'Project key already exists' });
    }

    // Create project and add user as owner in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name,
          description,
          key: key.toUpperCase(),
        },
      });

      // Add current user as project owner
      await tx.projectMember.create({
        data: {
          userId,
          projectId: newProject.id,
          role: ProjectRole.OWNER,
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          activityType: 'PROJECT_CREATED',
          description: `Project "${name}" created`,
          userId,
        },
      });

      return newProject;
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
};

// Get all projects that the user is a member of
export const getUserProjects = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const projects = await prisma.project.findMany({
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
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Failed to get projects' });
  }
};

// Get a single project by ID with detailed information
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findUnique({
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

    const project = await prisma.project.findUnique({
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
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Failed to get project details' });
  }
};

// Update a project
export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is an admin or owner of the project
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: id,
        },
      },
    });    if (!projectMember || projectMember.role !== ProjectRole.OWNER) {
      return res.status(403).json({ 
        message: 'Only project owners can update project details' 
      });
    }

    const updatedProject = await prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id },
        data: {
          name,
          description,
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          activityType: 'PROJECT_UPDATED',
          description: `Project "${name}" updated`,
          userId,
        },
      });

      return project;
    });

    res.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is the owner of the project
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: id,
        },
      },
    });

    if (!projectMember || projectMember.role !== ProjectRole.OWNER) {
      return res.status(403).json({ 
        message: 'Only project owners can delete projects' 
      });
    }

    // First get project name for the activity log
    const project = await prisma.project.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Delete the project - will cascade delete members and tickets due to Prisma schema
    await prisma.project.delete({
      where: { id },
    });

    // Log activity independently since project is already deleted
    await prisma.activity.create({
      data: {
        activityType: 'PROJECT_UPDATED',
        description: `Project "${project.name}" was deleted`,
        userId,
      },
    });

    res.json({ message: 'Project successfully deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

// Add a user to a project
export const addProjectMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Authentication required' });
    }    // Check if current user is project owner
    const currentMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: currentUserId,
          projectId: id,
        },
      },
    });

    if (!currentMember || currentMember.role !== ProjectRole.OWNER) {
      return res.status(403).json({ 
        message: 'Only project owners can add members' 
      });
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
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
    const projectMember = await prisma.$transaction(async (tx) => {
      const newMember = await tx.projectMember.create({
        data: {
          userId: userToAdd.id,
          projectId: id,
          role: role as ProjectRole,
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
      });      // Log activity
      await tx.activity.create({
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
    });

    res.status(201).json(projectMember);
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ message: 'Failed to add member to project' });
  }
};

// Remove a user from a project
export const removeProjectMember = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if current user is admin or owner
    const currentMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: currentUserId,
          projectId: id,
        },
      },
    });    if (!currentMember || currentMember.role !== ProjectRole.OWNER) {
      return res.status(403).json({ 
        message: 'Only project owners can remove members' 
      });
    }

    // Get user to be removed
    const memberToRemove = await prisma.projectMember.findUnique({
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
    if (memberToRemove.role === ProjectRole.OWNER) {
      return res.status(400).json({ message: 'Cannot remove the project owner' });
    }

    // Remove user from project
    await prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({
        where: {
          userId_projectId: {
            userId,
            projectId: id,
          },
        },
      });      // Log activity
      await tx.activity.create({
        data: {
          activityType: 'USER_JOINED',
          description: `${memberToRemove.user.name} was removed from the project`,
          userId: currentUserId,
          // Note: projectId is not a field in Activity model
          // Store project info in metadata instead
          metadata: { projectId: id },
        },
      });
    });

    res.json({ message: 'Member successfully removed from project' });
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({ message: 'Failed to remove member from project' });
  }
};

// Get members of a project
export const getProjectMembers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findUnique({
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
    const members = await prisma.projectMember.findMany({
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
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ message: 'Failed to get project members' });
  }
};
