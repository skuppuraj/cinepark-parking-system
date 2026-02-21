import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        theater: true,
        appliedRule: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.paymentStatus !== 'SUCCESS') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: booking.id,
      vehicleNumber: booking.vehicleNumber,
      vehicleType: booking.vehicleType,
      selectedEntryAt: booking.selectedEntryAt,
      expiryAt: booking.expiryAt,
      amountPaid: Number(booking.amountPaid),
      qrToken: booking.qrToken,
      qrUsed: booking.qrUsed,
      theater: {
        name: booking.theater.name,
        location: booking.theater.location,
      },
      appliedRule: booking.appliedRule
        ? {
            ruleName: booking.appliedRule.ruleName,
          }
        : null,
    });
  } catch (error) {
    console.error('Ticket fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}
