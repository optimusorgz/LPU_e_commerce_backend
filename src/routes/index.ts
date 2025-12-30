import { Router } from 'express';
import authRoutes from './auth.routes';
import productsRoutes from './products.routes';
import ordersRoutes from './orders.routes';
import paymentsRoutes from './payments.routes';
import wishlistRoutes from './wishlist.routes';
import uploadsRoutes from './uploads.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/admin', adminRoutes);

export default router;
