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

// Database connection options optimized for Render deployment
const dbOptions: postgres.Options<{}> = {
    max: 3,                      // Further reduced for reliability
    idle_timeout: 20,            // Reduced idle timeout
    connect_timeout: 30,         // Reduced to fail faster
    ssl: 'require',              // Always require SSL (not conditional)
    fetch_types: false,          // Disable type fetching for performance
    prepare: false,              // Disable prepared statements for Supabase compatibility
    connection: {
        application_name: 'campus-marketplace-backend',
    },
    transform: {
        undefined: null,         // Handle undefined values properly
    },
    onnotice: () => { },         // Suppress PostgreSQL notices
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
