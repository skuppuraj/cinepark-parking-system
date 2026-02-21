import jwt from 'jsonwebtoken';
import { Booking, TheaterSettings } from '@prisma/client';

const QR_SECRET = process.env.QR_SECRET || 'default-qr-secret-change-me';

interface QRPayload {
  bid: string; // Booking ID
  tid: string; // Theater ID
  vn: string; // Vehicle Number
  vt: string; // Vehicle Type
  iat: number;
  nbf: number; // Not before (entry time - buffer)
  exp: number; // Expiry (expiry time + grace)
  rid?: string; // Rule ID
  use: string;
}

export function generateQRToken(
  booking: Booking,
  settings: TheaterSettings
): string {
  const selectedEntryTimestamp = Math.floor(
    booking.selectedEntryAt.getTime() / 1000
  );
  const expiryTimestamp = Math.floor(booking.expiryAt.getTime() / 1000);

  const payload: QRPayload = {
    bid: booking.id,
    tid: booking.theaterId,
    vn: booking.vehicleNumber,
    vt: booking.vehicleType,
    iat: Math.floor(Date.now() / 1000),
    nbf: selectedEntryTimestamp - settings.entryBufferMins * 60,
    exp: expiryTimestamp + settings.gracePeriodMins * 60,
    rid: booking.appliedRuleId || undefined,
    use: 'parking_entry',
  };

  return jwt.sign(payload, QR_SECRET, { algorithm: 'HS256' });
}

export function verifyQRToken(token: string): QRPayload {
  return jwt.verify(token, QR_SECRET, {
    algorithms: ['HS256'],
  }) as QRPayload;
}
