import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    password: z.string().min(8),
    universityId: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const productSchema = z.object({
    title: z.string().min(3).max(255),
    description: z.string().optional(),
    priceCents: z.number().int().positive(),
    category: z.string().optional(),
    condition: z.enum(['new', 'like-new', 'good', 'fair']),
    location: z.string().optional(),
    images: z.array(z.string()).max(10),
});

export const orderSchema = z.object({
    productId: z.string().uuid(),
});

export const reportSchema = z.object({
    productId: z.string().uuid(),
    reason: z.string().min(10),
});

export const validate = (schema: z.ZodSchema) => {
    return (req: any, res: any, next: any) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Validation error', details: error.errors });
                return;
            }
            next(error);
        }
    };
};
