import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const createRazorpayOrder = async (
    amount: number, // in paise
    orderId: string
): Promise<any> => {
    const options = {
        amount,
        currency: 'INR',
        receipt: orderId,
    };

    return await razorpay.orders.create(options);
};

export const verifyRazorpaySignature = (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string
): boolean => {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
};
