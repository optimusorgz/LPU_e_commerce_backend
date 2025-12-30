
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        isAdmin: boolean;
    };
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        isAdmin: boolean;
    };
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Verify token with Supabase
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (error || !supabaseUser) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }

        // Fetch local user details (especially isAdmin)
        const localUser = await db.query.users.findFirst({
            where: eq(users.id, supabaseUser.id),
            columns: {
                isAdmin: true
            }
        });

        // Even if local user doesn't exist yet (race condition during sync?), 
        // we can at least set the ID and email from Supabase.
        // However, robust apps might want to fail here if sync hasn't happened.
        // For partial sync support, we default isAdmin to false.

        req.user = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            isAdmin: localUser?.isAdmin || false,
        };

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

export const requireAdmin = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user?.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};
