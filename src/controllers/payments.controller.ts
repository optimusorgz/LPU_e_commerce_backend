import { Request, Response } from 'express';
import { db } from '../db';
import { orders, products, paymentTransactions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.middleware';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpay.service';

export const createPaymentOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orderId } = req.body;
        const userId = req.user!.id;

        // Get order details
        const order = await db.query.orders.findFirst({
            where: eq(orders.id, orderId),
        });

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        // Verify user is buyer
        if (order.buyerId !== userId) {
            res.status(403).json({ error: 'Not authorized' });
            return;
        }

        // Check if already paid
        if (order.paymentStatus === 'paid') {
            res.status(400).json({ error: 'Order already paid' });
            return;
        }

        // Create Razorpay order
        const razorpayOrder = await createRazorpayOrder(order.totalAmount, order.id);

        // Create payment transaction record
        await db.insert(paymentTransactions).values({
            orderId: order.id,
            razorpayOrderId: razorpayOrder.id,
            amount: order.totalAmount,
            status: 'created',
        });

        res.json({
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            orderId: order.id,
        });
    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

        // Verify signature
        const isValid = verifyRazorpaySignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );

        if (!isValid) {
            res.status(400).json({ error: 'Invalid payment signature' });
            return;
        }

        // Update payment transaction
        await db
            .update(paymentTransactions)
            .set({
                razorpayPaymentId,
                signature: razorpaySignature,
                status: 'paid',
            })
            .where(eq(paymentTransactions.razorpayOrderId, razorpayOrderId));

        // Update order payment status
        const [order] = await db
            .update(orders)
            .set({
                paymentStatus: 'paid',
                updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId))
            .returning();

        // Update product status to sold (admin will handle delivery)
        if (order.productId) {
            await db
                .update(products)
                .set({
                    status: 'sold',
                    updatedAt: new Date(),
                })
                .where(eq(products.id, order.productId));
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

export const handlePaymentWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        // Razorpay webhook handling
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
        const receivedSignature = req.headers['x-razorpay-signature'] as string;

        // Verify webhook signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (receivedSignature !== expectedSignature) {
            res.status(400).json({ error: 'Invalid webhook signature' });
            return;
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === 'payment.captured') {
            // Handle successful payment
            const razorpayOrderId = payload.payment.entity.order_id;
            const razorpayPaymentId = payload.payment.entity.id;

            await db
                .update(paymentTransactions)
                .set({
                    razorpayPaymentId,
                    status: 'paid',
                })
                .where(eq(paymentTransactions.razorpayOrderId, razorpayOrderId));

            // Get order from transaction
            const transaction = await db.query.paymentTransactions.findFirst({
                where: eq(paymentTransactions.razorpayOrderId, razorpayOrderId),
            });

            if (transaction) {
                await db
                    .update(orders)
                    .set({ paymentStatus: 'paid' })
                    .where(eq(orders.id, transaction.orderId));
            }
        } else if (event === 'payment.failed') {
            // Handle failed payment
            const razorpayOrderId = payload.payment.entity.order_id;

            await db
                .update(paymentTransactions)
                .set({ status: 'failed' })
                .where(eq(paymentTransactions.razorpayOrderId, razorpayOrderId));
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};
