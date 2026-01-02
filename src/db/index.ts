import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

console.log('🔧 Initializing database connection...');

// Database connection options optimized for Render deployment with geographic latency
const dbOptions: postgres.Options<{}> = {
    max: 3,                      // Limited pool size for Render's free tier
    idle_timeout: 0,             // CRITICAL: Never close idle connections (0 = infinite)
    connect_timeout: 120,        // 2 minutes for Render US → Supabase Asia latency
    max_lifetime: 3600,          // Keep connections alive for 1 hour max
    ssl: 'require',              // Always require SSL
    fetch_types: false,          // Disable type fetching for performance
    prepare: false,              // CRITICAL: Disable prepared statements for PgBouncer
    keep_alive: 60,              // TCP keep-alive every 60 seconds
    connection: {
        application_name: 'campus-marketplace-backend',
        // Add keep-alive settings for long-distance connections
        options: '-c statement_timeout=30000',  // 30 second query timeout
    },
    transform: {
        undefined: null,         // Handle undefined values properly
    },
    onnotice: () => { },         // Suppress PostgreSQL notices
    // Enhanced error logging
    onparameter: (key, value) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`DB parameter: ${key} = ${value}`);
        }
    },
    // Connection retry on error
    debug: process.env.NODE_ENV !== 'production',
};

// For migrations - single connection
export const migrationClient = postgres(connectionString, {
    max: 1,
    ssl: dbOptions.ssl,
    prepare: false,
});

// For queries - connection pool  
const queryClient = postgres(connectionString, dbOptions);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Add helper method for raw SQL execution (health checks, etc.)
export const execute = async (query: string) => {
    return db.execute(sql.raw(query));
};

console.log('✅ Database client initialized');
