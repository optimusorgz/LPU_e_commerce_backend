import { Response } from 'express';
import { generateSignedUploadUrl } from '../services/r2.service';
import { AuthRequest } from '../middleware/auth.middleware';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const getUploadUrl = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { filename, contentType, folder = 'products' } = req.body;

        // Validate content type
        if (!ALLOWED_FILE_TYPES.includes(contentType)) {
            res.status(400).json({
                error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
            });
            return;
        }

        // Generate signed URL
        const result = await generateSignedUploadUrl(filename, contentType, folder);

        res.json(result);
    } catch (error) {
        console.error('Get upload URL error:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
};
