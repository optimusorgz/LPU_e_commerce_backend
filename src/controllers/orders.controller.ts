import { Response } from 'express';
import { db } from '../db';
import { orders, products, paymentTransactions } from '../db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.middleware';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { productId } = req.body;

        // Get product details
        const product = await db.query.products.findFirst({
            where: and(
                eq(products.id, productId),
                eq(products.status, 'available')
            ),
        });

        if (!product) {
            res.status(404).json({ error: 'Product not available' });
            return;
        }

        // Can't buy own product
        if (product.userId === userId) {
            res.status(400).json({ error: 'Cannot buy your own product' });
            return;
        }

        // Create order
        const [order] = await db.insert(orders).values({
            productId: product.id,
            buyerId: userId,
            sellerId: product.userId,
            totalAmount: product.priceCents,
            status: 'placed',
            paymentStatus: 'pending',
        }).returning();

        res.status(201).json({ order });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

export const getUserOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const userOrders = await db.query.orders.findMany({
            where: or(
                eq(orders.buyerId, userId),
                eq(orders.sellerId, userId)
            ),
            with: {
                product: true,
                buyer: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                seller: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: desc(orders.createdAt),
        });

        res.json({ orders: userOrders });
    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const isAdmin = req.user!.isAdmin;

        const order = await db.query.orders.findFirst({
            where: eq(orders.id, id),
            with: {
                product: true,
                buyer: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                seller: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
                paymentTransactions: true,
            },
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        // Check authorization
        if (!isAdmin && order.buyerId !== userId && order.sellerId !== userId) {
            res.status(403).json({ error: 'Not authorized to view this order' });
            return;
        }

        res.json({ order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
};
