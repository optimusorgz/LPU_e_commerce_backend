import { Router } from 'express';
import {
    getAllUsers,
    toggleUserBlock,
    getAllProducts,
    approveProduct,
    getAllOrders,
    updateOrderStatus,
    getAllReports,
    resolveReport,
    createReport,
    getAdminStats,
} from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validate, reportSchema } from '../utils/validators';

const router = Router();

// All admin routes require authentication AND admin role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/stats', getAdminStats);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:userId/toggle-block', toggleUserBlock);

// Product Management
router.get('/products', getAllProducts);
router.put('/products/:productId/approve', approveProduct);

// Order Management
router.get('/orders', getAllOrders);
router.put('/orders/:orderId/status', updateOrderStatus);

// Reports Management
router.get('/reports', getAllReports);
router.post('/reports', validate(reportSchema), createReport);
router.put('/reports/:reportId/resolve', resolveReport);

export default router;
