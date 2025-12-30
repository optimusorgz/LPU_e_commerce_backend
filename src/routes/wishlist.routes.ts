import { Router } from 'express';
import {
    addToWishlist,
    getWishlist,
    removeFromWishlist,
} from '../controllers/wishlist.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, addToWishlist);
router.get('/', authenticate, getWishlist);
router.delete('/:productId', authenticate, removeFromWishlist);

export default router;
