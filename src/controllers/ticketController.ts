import { Request, Response } from 'express';
import prisma from '../config/db';
import { TicketStatus, Priority, TicketType, ProjectRole } from '@prisma/client';

// Create a new ticket
export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      projectId, 
      assigneeId, 
      status, 
      priority, 
      type, 
      dueDate, 
      estimatedHours,
      labels
    } = req.body;
    const reporterId = req.user?.id;

    if (!reporterId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findUnique({
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
      const assigneeMember = await prisma.projectMember.findUnique({
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
    const ticket = await prisma.$transaction(async (tx) => {
      // Create the ticket
      const newTicket = await tx.ticket.create({
        data: {
          title,
          description,
          projectId,
          reporterId,
          assigneeId,
          status: status || TicketStatus.TODO,
          priority: priority || Priority.MEDIUM,
          type: type || TicketType.BUG,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          estimatedHours,
          // Connect labels if provided
          ...(labels && labels.length > 0 && {
            labels: {
              connect: labels.map((labelId: string) => ({ id: labelId })),
            },
          }),
        },
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
      await tx.activity.create({
        data: {
          activityType: 'TICKET_CREATED',
          description: `Ticket "${title}" was created`,
          ticketId: newTicket.id,
          userId: reporterId,
        },
      });

      return newTicket;
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
};

// Get all tickets for a project
export const getProjectTickets = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const { 
      status, 
      priority, 
      type, 
      assigneeId, 
      reporterId,
      labelId,
      search
    } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findUnique({
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
    const where: any = {
      projectId,
      ...(status && { status: status as TicketStatus }),
      ...(priority && { priority: priority as Priority }),
      ...(type && { type: type as TicketType }),
      ...(assigneeId && { assigneeId: assigneeId as string }),
      ...(reporterId && { reporterId: reporterId as string }),
      ...(labelId && { 
        labels: {
          some: { id: labelId as string }
        }
      }),
      ...(search && {
        OR: [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
    };

    const tickets = await prisma.ticket.findMany({
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
  } catch (error) {
    console.error('Get project tickets error:', error);
    res.status(500).json({ message: 'Failed to get tickets' });
  }
};

// Get a single ticket by ID
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get ticket with project information
    const ticket = await prisma.ticket.findUnique({
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
    const projectMember = await prisma.projectMember.findUnique({
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
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Failed to get ticket details' });
  }
};

// Update a ticket
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      type,
      assigneeId,
      dueDate,
      estimatedHours,
      labels,
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get the ticket to check permissions and track changes
    const ticket = await prisma.ticket.findUnique({
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
    const projectMember = await prisma.projectMember.findUnique({
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
      const assigneeMember = await prisma.projectMember.findUnique({
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
    const changes: string[] = [];
    if (title && title !== ticket.title) changes.push(`title changed to "${title}"`);
    if (status && status !== ticket.status) changes.push(`status changed to ${status}`);
    if (priority && priority !== ticket.priority) changes.push(`priority changed to ${priority}`);
    if (type && type !== ticket.type) changes.push(`type changed to ${type}`);
    if (assigneeId && assigneeId !== ticket.assigneeId) changes.push(`assignee changed`);
    if (dueDate && new Date(dueDate).toISOString() !== ticket.dueDate?.toISOString()) 
      changes.push(`due date changed`);
    
    // Update ticket in a transaction
    const updatedTicket = await prisma.$transaction(async (tx) => {
      // Update the ticket
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          title,
          description,
          status: status as TicketStatus,
          priority: priority as Priority,
          type: type as TicketType,
          assigneeId,
          dueDate: dueDate ? new Date(dueDate) : ticket.dueDate,
          estimatedHours,
          // Handle labels if provided
          ...(labels && {
            labels: {
              set: labels.map((labelId: string) => ({ id: labelId })),
            },
          }),
        },
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
        await tx.activity.create({
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
        await tx.activity.create({
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
        await tx.activity.create({
          data: {
            activityType: 'TICKET_ASSIGNED',
            description: `Ticket assigned to ${updated.assignee?.name || 'someone'}`,
            ticketId: id,
            userId,
          },
        });
      }

      return updated;
    });

    res.json(updatedTicket);
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Failed to update ticket' });
  }
};

// Delete a ticket
export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user is a project admin/owner or the reporter of the ticket
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: ticket.projectId,
        },
      },
    });    const canDelete = 
      userId === ticket.reporterId || 
      projectMember?.role === ProjectRole.OWNER;

    if (!projectMember || !canDelete) {
      return res.status(403).json({ 
        message: 'You do not have permission to delete this ticket' 
      });
    }

    // Delete the ticket
    await prisma.ticket.delete({
      where: { id },
    });

    res.json({ message: 'Ticket successfully deleted' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ message: 'Failed to delete ticket' });
  }
};

// Add a comment to a ticket
export const addComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const authorId = req.user?.id;

    if (!authorId) {
      return res.status(401).json({ message: 'Authentication required' });
    }    // Get the ticket to check project membership
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findUnique({
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
    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({        data: {
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
      await tx.activity.create({
        data: {          activityType: 'TICKET_COMMENTED',
          description: 'Comment added',
          ticketId: id,
          userId: authorId,
        },
      });

      return newComment;
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// Get all labels
export const getLabels = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const labels = await prisma.label.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    res.json(labels);
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ message: 'Failed to get labels' });
  }
};

// Create a new label
export const createLabel = async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const label = await prisma.label.create({
      data: {
        name,
        color,
      },
    });

    res.status(201).json(label);
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ message: 'Failed to create label' });
  }
};

// Get all tickets accessible to the current user
export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Get all projects that the user is a member of
    const userProjects = await prisma.projectMember.findMany({
      where: {
        userId,
      },
      select: {
        projectId: true,
      },
    });

    const projectIds = userProjects.map((project) => project.projectId);

    // Get all tickets from projects the user is a member of
    const tickets = await prisma.ticket.findMany({
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
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ message: 'Failed to get tickets' });
  }
};

// Get all comments for a specific ticket
export const getTicketComments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get the ticket to check project membership
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user is a member of the project
    const projectMember = await prisma.projectMember.findUnique({
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
    const comments = await prisma.comment.findMany({
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
  } catch (error) {
    console.error('Error fetching ticket comments:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
};

// Update ticket status
export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Validate status
    if (!Object.values(TicketStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }

    // Get ticket to check project membership and current status
    const ticket = await prisma.ticket.findUnique({
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
    const updatedTicket = await prisma.$transaction(async (tx) => {
      // Update the ticket status
      const updated = await tx.ticket.update({
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
      });      // Create activity log for status change
      await tx.activity.create({
        data: {
          userId,
          ticketId: ticket.id,
          activityType: 'TICKET_MOVED',
          description: `changed ticket status from ${ticket.status} to ${status}`,
        },
      });

      return updated;
    });

    res.json(updatedTicket);
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ message: 'Failed to update ticket status' });
  }
};
