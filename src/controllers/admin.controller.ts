import { Response } from 'express';
import { db } from '../db';
import { users, products, orders, reports } from '../db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.middleware';

// User Management
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const allUsers = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
                universityId: users.universityId,
                isAdmin: users.isAdmin,
                isBlocked: users.isBlocked,
                createdAt: users.createdAt,
            })
            .from(users)
            .orderBy(desc(users.createdAt));

        res.json({ users: allUsers });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const toggleUserBlock = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Can't block yourself
        if (user.id === req.user!.id) {
            res.status(400).json({ error: 'Cannot block yourself' });
            return;
        }

        // Can't block another admin
        if (user.isAdmin) {
            res.status(400).json({ error: 'Cannot block admin users' });
            return;
        }

        const [updatedUser] = await db
            .update(users)
            .set({ isBlocked: !user.isBlocked })
            .where(eq(users.id, userId))
            .returning();

        res.json({ user: updatedUser });
    } catch (error) {
        console.error('Toggle user block error:', error);
        res.status(500).json({ error: 'Failed to toggle user block' });
    }
};

// Product Management
export const getAllProducts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.query;

        let query = db
            .select()
            .from(products)
            .orderBy(desc(products.createdAt));

        const conditions: any[] = [];
        if (status) {
            conditions.push(eq(products.status, status as string));
        }

        const allProducts = await db.query.products.findMany({
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: desc(products.createdAt),
            ...(status && { where: eq(products.status, status as string) }),
        });

        res.json({ products: allProducts });
    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

export const approveProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { productId } = req.params;
        const { approved } = req.body; // true = approve, false = reject

        const [updatedProduct] = await db
            .update(products)
            .set({
                status: approved ? 'available' : 'rejected',
                updatedAt: new Date(),
            })
            .where(eq(products.id, productId))
            .returning();

        res.json({ product: updatedProduct });
    } catch (error) {
        console.error('Approve product error:', error);
        res.status(500).json({ error: 'Failed to approve product' });
    }
};

// Order Management
export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { paymentStatus, orderStatus } = req.query;

        const conditions: any[] = [];
        if (paymentStatus) {
            conditions.push(eq(orders.paymentStatus, paymentStatus as string));
        }
        if (orderStatus) {
            conditions.push(eq(orders.status, orderStatus as string));
        }

        const allOrders = await db.query.orders.findMany({
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

        // Filter manually if conditions exist
        let filteredOrders = allOrders;
        if (paymentStatus) {
            filteredOrders = filteredOrders.filter(o => o.paymentStatus === paymentStatus);
        }
        if (orderStatus) {
            filteredOrders = filteredOrders.filter(o => o.status === orderStatus);
        }

        res.json({ orders: filteredOrders });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orderId } = req.params;
        const { status } = req.body; // placed, confirmed, delivered, cancelled

        const [updatedOrder] = await db
            .update(orders)
            .set({
                status,
                updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId))
            .returning();

        res.json({ order: updatedOrder });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

// Reports Management
export const getAllReports = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const allReports = await db.query.reports.findMany({
            with: {
                product: true,
                reporter: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: desc(reports.createdAt),
        });

        res.json({ reports: allReports });
    } catch (error) {
        console.error('Get all reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

export const resolveReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reportId } = req.params;
        const { action, note } = req.body; // action: 'approve', 'remove', 'warn'

        const report = await db.query.reports.findFirst({
            where: eq(reports.id, reportId),
        });

        if (!report) {
            res.status(404).json({ error: 'Report not found' });
            return;
        }

        // Update report status
        await db
            .update(reports)
            .set({
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedBy: req.user!.id,
            })
            .where(eq(reports.id, reportId));

        // Take action on reported product
        if (action === 'remove' && report.productId) {
            await db
                .update(products)
                .set({ status: 'rejected' })
                .where(eq(products.id, report.productId));
        }

        res.json({ message: 'Report resolved successfully' });
    } catch (error) {
        console.error('Resolve report error:', error);
        res.status(500).json({ error: 'Failed to resolve report' });
    }
};

export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { productId, reason } = req.body;

        const [report] = await db.insert(reports).values({
            productId,
            reportedBy: userId,
            reason,
        }).returning();

        res.status(201).json({ report });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Failed to create report' });
    }
};

// Dashboard Analytics
export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [usersCount] = await db.select({ count: count() }).from(users);
        const [productsCount] = await db.select({ count: count() }).from(products);
        const [ordersCount] = await db.select({ count: count() }).from(orders);
        const [pendingProductsCount] = await db
            .select({ count: count() })
            .from(products)
            .where(eq(products.status, 'pending'));
        const [paidOrdersCount] = await db
            .select({ count: count() })
            .from(orders)
            .where(eq(orders.paymentStatus, 'paid'));

        res.json({
            stats: {
                totalUsers: usersCount.count,
                totalProducts: productsCount.count,
                totalOrders: ordersCount.count,
                pendingProducts: pendingProductsCount.count,
                paidOrders: paidOrdersCount.count,
            },
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
