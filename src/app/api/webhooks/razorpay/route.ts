import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { generateQRToken } from '@/lib/qrService';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Find booking
      const booking = await prisma.booking.findFirst({
        where: { razorpayOrderId: orderId },
      });

      if (booking && booking.paymentStatus !== 'SUCCESS') {
        // Get settings
        const settings = await prisma.theaterSettings.findUnique({
          where: { theaterId: booking.theaterId },
        });

        if (settings) {
          // Generate QR token if not already generated
          const qrToken = booking.qrToken || generateQRToken(booking, settings);

          // Update booking
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              paymentStatus: 'SUCCESS',
              razorpayPaymentId: paymentId,
              qrToken,
            },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
