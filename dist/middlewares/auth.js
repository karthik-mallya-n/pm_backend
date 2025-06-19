"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isManagerOrAdmin = exports.isAdmin = exports.authenticate = exports.extractToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const client_1 = require("@prisma/client");
// Extract token from authorization header
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
};
exports.extractToken = extractToken;
// Middleware to authenticate the user using JWT
const authenticate = (req, res, next) => {
    try {
        const token = (0, exports.extractToken)(req);
        if (!token) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.authenticate = authenticate;
// Middleware to check if user has admin role
const isAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    if (req.user.role !== client_1.Role.MANAGER) {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};
exports.isAdmin = isAdmin;
// Middleware to check if user has manager or admin role
const isManagerOrAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    if (req.user.role !== client_1.Role.MANAGER) {
        res.status(403).json({ message: 'Manager or admin access required' });
        return;
    }
    next();
};
exports.isManagerOrAdmin = isManagerOrAdmin;
