import { Router } from 'express';
import {
    createOrder,
    getUserOrders,
    getOrderById,
} from '../controllers/orders.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, orderSchema } from '../utils/validators';

const router = Router();

router.post('/', authenticate, validate(orderSchema), createOrder);
router.get('/', authenticate, getUserOrders);
router.get('/:id', authenticate, getOrderById);

export default router;
