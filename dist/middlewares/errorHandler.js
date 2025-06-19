"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Error handler middleware
const errorHandler = (err, req, res, next) => {
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
    res.status(statusCode).json(Object.assign({ message: err.message || 'An unexpected error occurred' }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
};
exports.default = errorHandler;
