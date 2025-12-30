import { Router } from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getUserProducts,
} from '../controllers/products.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, productSchema } from '../utils/validators';

const router = Router();

router.post('/', authenticate, validate(productSchema), createProduct);
router.get('/', getProducts);
router.get('/me', authenticate, getUserProducts);
router.get('/:id', getProductById);
router.put('/:id', authenticate, updateProduct);
router.delete('/:id', authenticate, deleteProduct);

export default router;
