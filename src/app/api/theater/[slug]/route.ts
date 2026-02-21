import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const theater = await prisma.theater.findUnique({
      where: { slug: params.slug },
      include: {
        settings: true,
      },
    });

    if (!theater) {
      return NextResponse.json(
        { error: 'Theater not found' },
        { status: 404 }
      );
    }

    if (!theater.parkingEnabled) {
      return NextResponse.json(
        { error: 'Parking is currently disabled for this theater' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: theater.id,
      name: theater.name,
      location: theater.location,
      settings: theater.settings,
    });
  } catch (error) {
    console.error('Theater fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
