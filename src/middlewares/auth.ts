import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AuthUser } from '../types/auth';
import { Role } from '@prisma/client';

// Extract token from authorization header
export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

// Middleware to authenticate the user using JWT
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user has admin role
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (req.user.role !== Role.MANAGER) {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
};

// Middleware to check if user has manager or admin role
export const isManagerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (req.user.role !== Role.MANAGER) {
    res.status(403).json({ message: 'Manager or admin access required' });
    return;
  }

  next();
};
