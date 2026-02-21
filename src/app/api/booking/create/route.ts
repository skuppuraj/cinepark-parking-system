import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, VehicleType, BookingType } from '@prisma/client';
import { matchPriceRule } from '@/lib/priceEngine';
import Razorpay from 'razorpay';

const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_SECRET || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      theaterId,
      vehicleType,
      vehicleNumber,
      entryDatetime,
      bookingType,
    } = body;

    // Validate required fields
    if (
      !theaterId ||
      !vehicleType ||
      !vehicleNumber ||
      !entryDatetime ||
      !bookingType
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get theater settings
    const settings = await prisma.theaterSettings.findUnique({
      where: { theaterId },
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Theater settings not found' },
        { status: 404 }
      );
    }

    // Calculate price
    const entryDate = new Date(entryDatetime);
    const priceResult = await matchPriceRule(
      theaterId,
      vehicleType as VehicleType,
      entryDate
    );

    // Calculate expiry time
    const expiryDate = new Date(
      entryDate.getTime() + settings.defaultDurationMins * 60 * 1000
    );

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        theaterId,
        bookingType: bookingType as BookingType,
        vehicleNumber: vehicleNumber.toUpperCase(),
        vehicleType: vehicleType as VehicleType,
        selectedEntryAt: entryDate,
        expiryAt: expiryDate,
        appliedRuleId: priceResult.rule?.id || null,
        amountPaid: priceResult.price,
        paymentStatus: 'PENDING',
      },
    });

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(priceResult.price * 100), // Amount in paise
      currency: 'INR',
      receipt: booking.id,
      notes: {
        bookingId: booking.id,
        vehicleNumber: booking.vehicleNumber,
      },
    });

    // Update booking with Razorpay order ID
    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    return NextResponse.json({
      bookingId: booking.id,
      razorpayOrderId: razorpayOrder.id,
      amount: priceResult.price,
      keyId: process.env.RAZORPAY_KEY_ID,
      vehicleNumber: booking.vehicleNumber,
      ruleName: priceResult.ruleName,
      entryTime: entryDate.toISOString(),
      expiryTime: expiryDate.toISOString(),
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
