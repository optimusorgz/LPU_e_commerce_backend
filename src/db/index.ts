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

// Database connection options optimized for production hosting
const dbOptions: postgres.Options<{}> = {
    max: 10,                    // Maximum connections in pool
    idle_timeout: 20,           // Close idle connections after 20s
    connect_timeout: 30,        // Connection timeout (increased for Render latency)
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    fetch_types: false,         // Disable type fetching for performance
    prepare: false,             // Disable prepared statements for compatibility
    onnotice: () => { },        // Suppress PostgreSQL notices
    // Enhanced error logging for production
    onparameter: (key, value) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`DB parameter: ${key} = ${value}`);
        }
    },
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
