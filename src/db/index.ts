import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

// Database connection options for production
const dbOptions = {
    max: 10, // Maximum number of connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Prefer IPv4 to avoid IPv6 connectivity issues on some hosting platforms
    types: {
        // Add any custom type parsers here if needed
    },
    prepare: false, // Disable prepared statements for better compatibility
    onnotice: () => { }, // Suppress notices in production
};

// For migrations - single connection
export const migrationClient = postgres(connectionString, {
    max: 1,
    ssl: dbOptions.ssl,
});

// For queries - connection pool
const queryClient = postgres(connectionString, dbOptions);

export const db = drizzle(queryClient, { schema });
