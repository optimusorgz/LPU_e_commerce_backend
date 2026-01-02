import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes';

import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - CRITICAL for Render deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Allowed origins for CORS
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
].filter(Boolean);

// CORS configuration - Production ready
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check with database verification
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const { db } = await import('./db');
        await db.execute('SELECT 1');

        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Server instance for graceful shutdown
let server: any;

// Graceful shutdown handler
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    if (server) {
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    if (server) {
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Async server startup with database verification
async function startServer() {
    try {
        // Verify database connection
        console.log('🔄 Verifying database connection...');
        const { db } = await import('./db');

        try {
            await db.execute('SELECT 1');
            console.log('✅ Database connection verified');
        } catch (dbError) {
            console.error('❌ Database connection failed:', dbError);
            console.error('⚠️  Server will start but database queries will fail!');

            // In production, log the DATABASE_URL format (without password)
            if (process.env.DATABASE_URL) {
                try {
                    const url = new URL(process.env.DATABASE_URL);
                    console.log(`📊 DATABASE_URL format: ${url.protocol}//${url.username}@${url.hostname}:${url.port}${url.pathname}`);
                } catch (e) {
                    console.error('❌ Invalid DATABASE_URL format');
                }
            }
        }

        // Start HTTP server
        server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API: http://localhost:${PORT}/api`);
            console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
            console.log(`🔒 Trust proxy: enabled`);

            // Validate critical environment variables
            const requiredEnvVars = ['DATABASE_URL', 'FRONTEND_URL'];
            const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

            if (missingEnvVars.length > 0) {
                console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
            } else {
                console.log(`✅ All required environment variables are set`);
            }
        });

        return server;
    } catch (error) {
        console.error('❌ Fatal error during startup:', error);
        process.exit(1);
    }
}

// Export for testing
export default app;

// Start server only if not in test environment
if (require.main === module) {
    startServer();
}
