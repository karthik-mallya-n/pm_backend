import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import projectRoutes from "./routes/projectRoutes";
import ticketRoutes from "./routes/ticketRoutes";
import userRoutes from "./routes/userRoutes";
import teamRoutes from "./routes/teamRoutes";
import errorHandler from "./middlewares/errorHandler";
import config from "./config";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan(config.nodeEnv === "development" ? "dev" : "combined"));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/team', teamRoutes);

// Error handler middleware
app.use((
  err: Error & { status?: number; errors?: any[] }, 
  req: express.Request, 
  res: express.Response, 
  next: express.NextFunction
) => errorHandler(err, req, res, next));

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});