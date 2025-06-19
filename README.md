# Bug Tracker API

A comprehensive REST API for a bug/issue tracking system built with Node.js, Express, Prisma and PostgreSQL.

## Features

- **User Authentication & Management**: JWT-based authentication with role management
- **Project Management**: Create, read, update, delete projects 
- **Ticket/Issue Tracking**: Create tickets with priorities, statuses, and types
- **Kanban Board Support**: Move tickets across different statuses
- **Comments & Activity Tracking**: Discussion threads and activity logs
- **Labels & Filtering**: Organize tickets with labels and advanced filtering

## Database Schema

The system uses PostgreSQL with Prisma ORM and includes the following main entities:

- **User**: Authentication and user data
- **Project**: Project details and configuration
- **ProjectMember**: Relationship between users and projects with roles
- **Ticket**: Core entity for issues/bugs/tasks
- **Comment**: Discussion on tickets
- **Activity**: Audit trail of all actions
- **Label**: Categorization for tickets

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies
   ```
   npm install
   ```
3. Create a `.env` file from the example
   ```
   cp .env.example .env
   ```
4. Update the `.env` file with your PostgreSQL connection string
5. Run Prisma migration
   ```
   npm run prisma:migrate
   ```
6. Generate Prisma client
   ```
   npm run prisma:generate
   ```
7. Start the development server
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects

- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get a specific project
- `POST /api/projects` - Create a project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project
- `POST /api/projects/:id/members` - Add a member to a project
- `DELETE /api/projects/:id/members/:userId` - Remove a member from a project

### Tickets

- `GET /api/tickets/project/:projectId` - Get all tickets for a project
- `GET /api/tickets/:id` - Get a specific ticket
- `POST /api/tickets` - Create a ticket
- `PUT /api/tickets/:id` - Update a ticket
- `DELETE /api/tickets/:id` - Delete a ticket
- `POST /api/tickets/:ticketId/comments` - Add a comment to a ticket
- `GET /api/tickets/labels` - Get all labels
- `POST /api/tickets/labels` - Create a label

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get a specific user
- `PUT /api/users/:id` - Update a user
- `POST /api/users/change-password` - Change password
- `DELETE /api/users/:id` - Delete a user (admin only)

## License

This project is licensed under the MIT License.
