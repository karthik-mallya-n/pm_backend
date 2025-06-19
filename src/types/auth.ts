import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

// Express RequestHandler with auth user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
