import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyQRToken } from '@/lib/qrService';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authPayload = verifyToken(authToken);
    if (!authPayload || authPayload.role !== 'STAFF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { qrToken } = body;

    if (!qrToken) {
      return NextResponse.json({ error: 'QR token required' }, { status: 400 });
    }

    let payload;
    try {
      payload = verifyQRToken(qrToken);
    } catch (error) {
      return NextResponse.json({ valid: false, reason: 'INVALID_OR_EXPIRED' });
    }

    if (payload.tid !== authPayload.theaterId) {
      return NextResponse.json({ valid: false, reason: 'THEATER_MISMATCH' });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < payload.nbf) return NextResponse.json({ valid: false, reason: 'TOO_EARLY' });
    if (now > payload.exp) return NextResponse.json({ valid: false, reason: 'EXPIRED' });

    const booking = await prisma.booking.findUnique({ where: { id: payload.bid } });
    if (!booking || booking.paymentStatus !== 'SUCCESS') {
      return NextResponse.json({ valid: false, reason: 'PAYMENT_NOT_CONFIRMED' });
    }

    if (booking.qrUsed) {
      return NextResponse.json({ valid: false, reason: 'ALREADY_USED' });
    }

    await prisma.booking.update({
      where: { id: payload.bid },
      data: { qrUsed: true, qrUsedAt: new Date() },
    });

    await prisma.scanLog.create({
      data: { bookingId: payload.bid, staffId: authPayload.userId, scanResult: 'VALID' },
    });

    return NextResponse.json({
      valid: true,
      vehicleNumber: payload.vn,
      vehicleType: payload.vt,
      validFrom: new Date(payload.nbf * 1000),
      validTo: new Date(payload.exp * 1000),
      amountPaid: Number(booking.amountPaid),
    });
  } catch (error) {
    return NextResponse.json({ valid: false, reason: 'SCAN_ERROR' }, { status: 500 });
  }
}
