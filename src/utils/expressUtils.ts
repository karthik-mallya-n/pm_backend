import { Request, Response, NextFunction, RequestHandler } from 'express';

// Type for async request handlers
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | any>;

// Helper function to wrap async request handlers and catch errors
export const asyncHandler = (
  fn: AsyncRequestHandler
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
