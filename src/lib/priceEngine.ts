import { PrismaClient, VehicleType, PriceRule } from '@prisma/client';

const prisma = new PrismaClient();

interface PriceMatch {
  rule: PriceRule | null;
  price: number;
  ruleName: string;
}

export async function matchPriceRule(
  theaterId: string,
  vehicleType: VehicleType,
  entryDatetime: Date
): Promise<PriceMatch> {
  const dt = new Date(entryDatetime);
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = dayNames[dt.getDay()];
  const hours = dt.getHours().toString().padStart(2, '0');
  const minutes = dt.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Fetch all active rules for this theater and vehicle type
  const rules = await prisma.priceRule.findMany({
    where: {
      theaterId,
      vehicleType,
      status: 'ACTIVE',
    },
    orderBy: {
      priority: 'desc',
    },
  });

  // Filter matching rules
  const matched = rules.filter((rule) => {
    const validDaysArray = rule.validDays as string[];

    // Day matching logic
    const dayMatch =
      validDaysArray.includes('ALL') ||
      validDaysArray.includes(dayName) ||
      (validDaysArray.includes('WEEKDAYS') &&
        !['SAT', 'SUN'].includes(dayName)) ||
      (validDaysArray.includes('WEEKENDS') && ['SAT', 'SUN'].includes(dayName));

    // Time matching logic
    const timeMatch =
      !rule.timeFrom ||
      !rule.timeTo ||
      (timeStr >= rule.timeFrom && timeStr <= rule.timeTo);

    return dayMatch && timeMatch;
  });

  // Return highest priority rule
  if (matched.length > 0) {
    const selectedRule = matched[0];
    return {
      rule: selectedRule,
      price: Number(selectedRule.price),
      ruleName: selectedRule.ruleName,
    };
  }

  // Fallback to default price
  const settings = await prisma.theaterSettings.findUnique({
    where: { theaterId },
  });

  return {
    rule: null,
    price: Number(settings?.defaultFallbackPrice || 50),
    ruleName: 'Default Fallback',
  };
}
