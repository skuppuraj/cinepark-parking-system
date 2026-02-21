import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, generateToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, pin, password } = body;

    if (!mobile) {
      return NextResponse.json({ error: 'Mobile required' }, { status: 400 });
    }

    const staff = await prisma.user.findFirst({
      where: { mobile, role: 'STAFF', status: 'ACTIVE' },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let isValid = false;
    if (pin && staff.pin) isValid = pin === staff.pin;
    else if (password) isValid = await verifyPassword(password, staff.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(staff.id, staff.theaterId, staff.role);
    const response = NextResponse.json({
      success: true,
      user: { id: staff.id, name: staff.name, role: staff.role },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 604800,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
