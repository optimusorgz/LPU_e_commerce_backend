import { Response } from 'express';
import { db } from '../db';
import { wishlist, products, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.middleware';

export const addToWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { productId } = req.body;

        // Check if product exists
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        // Check if already in wishlist
        const existing = await db.query.wishlist.findFirst({
            where: and(
                eq(wishlist.userId, userId),
                eq(wishlist.productId, productId)
            ),
        });

        if (existing) {
            res.status(400).json({ error: 'Product already in wishlist' });
            return;
        }

        const [item] = await db.insert(wishlist).values({
            userId,
            productId,
        }).returning();

        res.status(201).json({ wishlistItem: item });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
};

export const getWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const items = await db.query.wishlist.findMany({
            where: eq(wishlist.userId, userId),
            with: {
                product: {
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });

        res.json({ wishlist: items });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { productId } = req.params;

        await db.delete(wishlist).where(
            and(
                eq(wishlist.userId, userId),
                eq(wishlist.productId, productId)
            )
        );

        res.json({ message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
};
