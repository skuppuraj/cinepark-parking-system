import { NextRequest, NextResponse } from 'next/server';
import { matchPriceRule } from '@/lib/priceEngine';
import { VehicleType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theaterId, vehicleType, entryDatetime } = body;

    if (!theaterId || !vehicleType || !entryDatetime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const entryDate = new Date(entryDatetime);
    const result = await matchPriceRule(
      theaterId,
      vehicleType as VehicleType,
      entryDate
    );

    return NextResponse.json({
      price: result.price,
      ruleName: result.ruleName,
      ruleId: result.rule?.id || null,
    });
  } catch (error) {
    console.error('Price calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate price' },
      { status: 500 }
    );
  }
}
