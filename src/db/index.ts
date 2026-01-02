import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();

// Force IPv4 DNS resolution globally - must be set before any network calls
if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

// Parse and resolve hostname to IPv4 to avoid IPv6 connectivity issues
async function resolveConnectionString(connStr: string): Promise<string> {
    try {
        const url = new URL(connStr);
        const hostname = url.hostname;

        // Skip resolution for localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return connStr;
        }

        // Resolve to IPv4 only
        const lookup = promisify(dns.lookup);
        const resolved = await lookup(hostname, { family: 4 });
        const ipv4Address = Array.isArray(resolved) ? resolved[0].address : resolved.address;

        console.log(`✅ Resolved ${hostname} to IPv4: ${ipv4Address}`);

        // Replace hostname with IP address in connection string
        return connStr.replace(hostname, ipv4Address);
    } catch (error) {
        console.warn('⚠️  Failed to resolve hostname to IPv4, using original connection string:', error);
        return connStr;
    }
}

// Database connection options
const dbOptions: postgres.Options<{}> = {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    fetch_types: false,
    prepare: false,
    onnotice: () => { },
};

// Initialize database connection with IPv4-resolved connection string
let queryClient: postgres.Sql;
let migrationClientInstance: postgres.Sql;

async function initializeDatabase() {
    const resolvedConnString = await resolveConnectionString(connectionString);

    // For migrations - single connection
    migrationClientInstance = postgres(resolvedConnString, {
        max: 1,
        ssl: dbOptions.ssl,
        prepare: false,
    });

    // For queries - connection pool
    queryClient = postgres(resolvedConnString, dbOptions);
}

// Initialize immediately
const dbPromise = initializeDatabase();

// Export migration client (will be ready after promise resolves)
export const migrationClient = new Proxy({} as postgres.Sql, {
    get(target, prop) {
        if (!migrationClientInstance) {
            throw new Error('Database not initialized. Wait for initialization to complete.');
        }
        return migrationClientInstance[prop as keyof postgres.Sql];
    }
});

// Export db (will be ready after promise resolves)
let dbInstance: ReturnType<typeof drizzle<typeof schema>>;
dbPromise.then(() => {
    dbInstance = drizzle(queryClient, { schema });
});

// Create properly typed database export
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
    get(target, prop) {
        if (!dbInstance) {
            throw new Error('Database not initialized. Wait for initialization to complete.');
        }
        const value = (dbInstance as any)[prop];
        return typeof value === 'function' ? value.bind(dbInstance) : value;
    }
}) as ReturnType<typeof drizzle<typeof schema>>;

// Export promise for explicit waiting if needed
export const dbReady = dbPromise;
