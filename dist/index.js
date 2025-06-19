"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const ticketRoutes_1 = __importDefault(require("./routes/ticketRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
const config_1 = __importDefault(require("./config"));
// Load environment variables
dotenv_1.default.config();
// Initialize express app
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)(config_1.default.nodeEnv === "development" ? "dev" : "combined"));
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/projects', projectRoutes_1.default);
app.use('/api/tickets', ticketRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/team', teamRoutes_1.default);
// Error handler middleware
app.use((err, req, res, next) => (0, errorHandler_1.default)(err, req, res, next));
// Start server
const PORT = config_1.default.port;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${config_1.default.nodeEnv} mode`);
});
