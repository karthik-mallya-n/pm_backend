import { Request, Response } from 'express';
import prisma from '../config/db';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

// Get all users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;
    
    // For admin users, return all user data
    // For non-admin users, return limited data without emails for privacy
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: currentUser?.role === Role.MANAGER, // Only include email for managers
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
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
};

// Get a user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user details' });
  }
};

// Update a user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, avatar, role } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Only allow users to update their own profile (except for admins)
    if (id !== currentUser.id && currentUser.role !== Role.MANAGER) {
      return res.status(403).json({ message: 'Cannot update other users' });
    }

    // Only admins can change roles
    if (role && currentUser.role !== Role.MANAGER) {
      return res.status(403).json({ message: 'Only admins can change user roles' });
    }

    // If email is being changed, check for uniqueness
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(avatar && { avatar }),
        ...(role && { role }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// Change user password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

// Delete a user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Only admins can delete users
    if (currentUser.role !== Role.MANAGER) {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Get user stats (count of assigned tickets, completed tickets, and projects)
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get counts of assigned tickets, completed tickets, and projects
    const [assignedTicketsCount, completedTicketsCount, projectsCount] = await Promise.all([
      // Total assigned tickets
      prisma.ticket.count({
        where: {
          assigneeId: userId,
        },
      }),
      // Completed tickets
      prisma.ticket.count({
        where: {
          assigneeId: userId,
          status: 'DONE',
        },
      }),
      // Projects the user is a member of
      prisma.projectMember.count({
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
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Failed to get user stats' });
  }
};

// Get user activities
export const getUserActivities = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }    // Get user activities
    const activities = await prisma.activity.findMany({
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
      const metadata = activity.metadata as any;
      const projectName = metadata?.projectName;
      const ticketTitle = metadata?.ticketTitle;
      
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
  } catch (error) {
    console.error('Get user activities error:', error);
    res.status(500).json({ message: 'Failed to get user activities' });
  }
};

// Invite a new user
export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { email, name, role = 'MEMBER' } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Only admins and managers can invite users
    if (currentUser.role !== Role.MANAGER) {
      return res.status(403).json({ message: 'Only admins and managers can invite users' });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate a temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role as Role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });    // Create an activity for user invitation
    await prisma.activity.create({
      data: {
        userId: currentUser.id,
        activityType: 'USER_INVITE' as any, // Type cast to bypass TypeScript error
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
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ message: 'Failed to invite user' });
  }
};
