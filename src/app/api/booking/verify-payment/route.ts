import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { generateQRToken } from '@/lib/qrService';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET || '')
      .update(text)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Find booking by order ID
    const booking = await prisma.booking.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get theater settings for QR generation
    const settings = await prisma.theaterSettings.findUnique({
      where: { theaterId: booking.theaterId },
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Theater settings not found' },
        { status: 404 }
      );
    }

    // Generate QR token
    const qrToken = generateQRToken(booking, settings);

    // Update booking with payment success and QR token
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'SUCCESS',
        razorpayPaymentId: razorpay_payment_id,
        qrToken,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
