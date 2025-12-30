import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.middleware';

export const syncUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // User is already authenticated by middleware via Supabase token
        const { id, email } = req.user!;
        const { name, universityId } = req.body;

        // Check for Gmail address
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!gmailRegex.test(email)) {
            res.status(400).json({
                error: 'Registration restricted to Gmail addresses'
            });
            return;
        }

        // Check if user already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.id, id),
        });

        if (existingUser) {
            // User already synced, return success
            res.json({ user: existingUser });
            return;
        }

        // Create user in local DB with SAME ID as Supabase
        const [newUser] = await db.insert(users).values({
            id, // explicit ID from Supabase
            name: name || email.split('@')[0],
            email,
            universityId,
            passwordHash: '', // Managed by Supabase
        }).returning({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            bio: users.bio,
            isAdmin: users.isAdmin,
            createdAt: users.createdAt,
        });

        res.status(201).json({ user: newUser });
    } catch (error) {
        console.error('Sync user error:', error);
        res.status(500).json({ error: 'Failed to sync user profile' });
    }
};

export const getCurrentUser = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const email = req.user.email;
        
        // Try to get name from Supabase user metadata
        const supabaseUserName = req.user.user_metadata?.name || req.user.name;

        let user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                passwordHash: false,
            },
        });

        if (!user) {
            // User exists in Supabase (middleware passed) but not in local DB
            // Use Supabase metadata name if available, otherwise use email prefix
            const defaultName = supabaseUserName || email.split('@')[0];
            
            const [newUser] = await db.insert(users).values({
                id: userId,
                email: email,
                name: defaultName,
                passwordHash: '',
                isAdmin: false,
            }).returning();

            user = newUser;
        }

        res.json({ user });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

export const updateProfile = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const { name, avatarUrl, bio } = req.body;

        const [updatedUser] = await db
            .update(users)
            .set({
                name,
                avatarUrl,
                bio,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
                bio: users.bio,
            });

        res.json({ user: updatedUser });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};
