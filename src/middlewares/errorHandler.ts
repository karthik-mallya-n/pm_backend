import { Request, Response, NextFunction } from 'express';

// Error handler middleware
const errorHandler = (
  err: Error & { status?: number; errors?: any[] },
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const statusCode = err.status || 500;

  // Format response for validation errors
  if (err.name === 'ValidationError' || err.errors) {
    res.status(400).json({
      message: 'Validation error',
      errors: err.errors || [],
    });
    return;
  }

  // Generic error response
  res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
