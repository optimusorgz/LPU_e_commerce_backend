import { Router } from 'express';
import {
    createPaymentOrder,
    verifyPayment,
    handlePaymentWebhook,
} from '../controllers/payments.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/create-order', authenticate, createPaymentOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/webhook', handlePaymentWebhook); // No auth - Razorpay webhook

export default router;
