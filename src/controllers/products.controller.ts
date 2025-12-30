import { Response } from 'express';
import { db } from '../db';
import { products, users } from '../db/schema';
import { eq, and, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { generateUniqueSlug } from '../utils/slugify';
import { AuthRequest } from '../middleware/auth.middleware';

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { title, description, priceCents, category, condition, location, images } = req.body;

        const [product] = await db.insert(products).values({
            userId,
            title,
            slug: '', // Will update after insert to use id
            description,
            priceCents,
            category,
            condition,
            location,
            images,
            status: 'pending', // Admin approval required
        }).returning();

        // Update slug with id
        const slug = generateUniqueSlug(title, product.id);
        const [updatedProduct] = await db
            .update(products)
            .set({ slug })
            .where(eq(products.id, product.id))
            .returning();

        res.status(201).json({ product: updatedProduct });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
};

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            q, // search query
            category,
            condition,
            minPrice,
            maxPrice,
            sort = 'newest',
            page = '1',
            limit = '20',
        } = req.query;

        let query = db
            .select({
                id: products.id,
                title: products.title,
                slug: products.slug,
                description: products.description,
                priceCents: products.priceCents,
                currency: products.currency,
                category: products.category,
                condition: products.condition,
                images: products.images,
                location: products.location,
                status: products.status,
                viewsCount: products.viewsCount,
                createdAt: products.createdAt,
                user: {
                    id: users.id,
                    name: users.name,
                    avatarUrl: users.avatarUrl,
                },
            })
            .from(products)
            .leftJoin(users, eq(products.userId, users.id))
            .where(eq(products.status, 'available'));

        // Apply filters
        const conditions: any[] = [eq(products.status, 'available')];

        if (q) {
            conditions.push(
                sql`${products.title} ILIKE ${`%${q}%`} OR ${products.description} ILIKE ${`%${q}%`}`
            );
        }
        if (category) {
            conditions.push(eq(products.category, category as string));
        }
        if (condition) {
            conditions.push(eq(products.condition, condition as string));
        }
        if (minPrice) {
            conditions.push(gte(products.priceCents, parseInt(minPrice as string)));
        }
        if (maxPrice) {
            conditions.push(lte(products.priceCents, parseInt(maxPrice as string)));
        }

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

        const results = await db
            .select({
                id: products.id,
                title: products.title,
                slug: products.slug,
                description: products.description,
                priceCents: products.priceCents,
                currency: products.currency,
                category: products.category,
                condition: products.condition,
                images: products.images,
                location: products.location,
                status: products.status,
                viewsCount: products.viewsCount,
                createdAt: products.createdAt,
                user: {
                    id: users.id,
                    name: users.name,
                    avatarUrl: users.avatarUrl,
                },
            })
            .from(products)
            .leftJoin(users, eq(products.userId, users.id))
            .where(and(...conditions))
            .orderBy(
                sort === 'price-low' ? asc(products.priceCents) :
                    sort === 'price-high' ? desc(products.priceCents) :
                        desc(products.createdAt)
            )
            .limit(parseInt(limit as string))
            .offset(offset);

        res.json({ products: results, page: parseInt(page as string), limit: parseInt(limit as string) });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

export const getProductById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Increment view count
        await db
            .update(products)
            .set({ viewsCount: sql`${products.viewsCount} + 1` })
            .where(eq(products.id, id));

        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                        universityId: true,
                    },
                },
            },
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.json({ product });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const isAdmin = req.user!.isAdmin;

        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        // Check ownership
        if (product.userId !== userId && !isAdmin) {
            res.status(403).json({ error: 'Not authorized to update this product' });
            return;
        }

        const { title, description, priceCents, category, condition, location, images } = req.body;

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (title) {
            updateData.title = title;
            updateData.slug = generateUniqueSlug(title, id);
        }
        if (description !== undefined) updateData.description = description;
        if (priceCents) updateData.priceCents = priceCents;
        if (category) updateData.category = category;
        if (condition) updateData.condition = condition;
        if (location) updateData.location = location;
        if (images) updateData.images = images;

        const [updatedProduct] = await db
            .update(products)
            .set(updateData)
            .where(eq(products.id, id))
            .returning();

        res.json({ product: updatedProduct });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const isAdmin = req.user!.isAdmin;

        const product = await db.query.products.findFirst({
            where: eq(products.id, id),
        });

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        // Check ownership
        if (product.userId !== userId && !isAdmin) {
            res.status(403).json({ error: 'Not authorized to delete this product' });
            return;
        }

        await db.delete(products).where(eq(products.id, id));

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
};

export const getUserProducts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const userProducts = await db.query.products.findMany({
            where: eq(products.userId, userId),
            orderBy: desc(products.createdAt),
        });

        res.json({ products: userProducts });
    } catch (error) {
        console.error('Get user products error:', error);
        res.status(500).json({ error: 'Failed to fetch user products' });
    }
};
