# CinePark Complete Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create PostgreSQL database:
```bash
createdb cinepark
```

Or use Supabase (recommended for quick start):
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string

### 3. Configure Environment

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cinepark"

RAZORPAY_KEY_ID="rzp_test_YOUR_KEY"
RAZORPAY_SECRET="YOUR_SECRET"
RAZORPAY_WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"

JWT_SECRET="your-32-char-random-string"
QR_SECRET="another-32-char-random-string"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Initialize Database

```bash
npx prisma db push
```

### 5. Seed Demo Data

Create `prisma/seed.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create theater
  const theater = await prisma.theater.create({
    data: {
      slug: 'pvr-chennai',
      name: 'PVR Cinemas - Ampa Skywalk',
      location: 'Nelson Manickam Road, Aminjikarai, Chennai',
      parkingEnabled: true,
    },
  });

  // Create settings
  await prisma.theaterSettings.create({
    data: {
      theaterId: theater.id,
      maxAdvanceDays: 7,
      defaultDurationMins: 180,
      entryBufferMins: 15,
      gracePeriodMins: 10,
      defaultFallbackPrice: 50,
    },
  });

  // Create price rules
  await prisma.priceRule.createMany({
    data: [
      {
        theaterId: theater.id,
        ruleName: 'Morning 2W Weekday',
        vehicleType: 'TWO_WHEELER',
        price: 30,
        validDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        timeFrom: '06:00',
        timeTo: '12:00',
        priority: 1,
        status: 'ACTIVE',
      },
      {
        theaterId: theater.id,
        ruleName: 'Evening Weekend 4W',
        vehicleType: 'FOUR_WHEELER',
        price: 80,
        validDays: ['SAT', 'SUN'],
        timeFrom: '17:00',
        timeTo: '22:00',
        priority: 2,
        status: 'ACTIVE',
      },
    ],
  });

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      theaterId: theater.id,
      name: 'Admin User',
      email: 'admin@cinepark.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 10);
  await prisma.user.create({
    data: {
      theaterId: theater.id,
      name: 'Rajan Kumar',
      mobile: '9876543210',
      passwordHash: staffPassword,
      pin: '1234',
      role: 'STAFF',
      status: 'ACTIVE',
    },
  });

  console.log('Seed completed!');
  console.log('Theater slug: pvr-chennai');
  console.log('Admin: admin@cinepark.com / admin123');
  console.log('Staff: 9876543210 / PIN: 1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run seed:
```bash
node prisma/seed.js
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing the System

### Test Walk-in Booking

1. Open: `http://localhost:3000/park/pvr-chennai`
2. Vehicle: 4W
3. Number: TN 07 AB 1234
4. Click "Pay Now"
5. Use test UPI: `success@razorpay`
6. Get QR ticket

### Test Staff Scan

1. Open: `http://localhost:3000/staff/login`
2. Mobile: 9876543210
3. PIN: 1234
4. Go to Scan page
5. Allow camera access
6. Scan QR from booking
7. See green validation

### Test Admin Dashboard

1. Open: `http://localhost:3000/admin/login`
2. Email: admin@cinepark.com
3. Password: admin123
4. View dashboard
5. Create price rules
6. View reports

## Deployment to Vercel

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Set Environment Variables

In Vercel dashboard:
- Go to Settings → Environment Variables
- Add all variables from `.env`
- Make sure `NEXT_PUBLIC_APP_URL` points to your Vercel URL

### 4. Configure Razorpay Webhook

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Settings → Webhooks
3. Add webhook URL: `https://your-site.vercel.app/api/webhooks/razorpay`
4. Select events: `payment.captured`
5. Copy webhook secret to env

### 5. Generate Static QR Code

For walk-in parking:

```
URL: https://your-site.vercel.app/park/pvr-chennai
```

Print and place at parking entrance.

## Production Checklist

- [ ] Change all secrets (JWT_SECRET, QR_SECRET)
- [ ] Use Razorpay live keys
- [ ] Set up SSL (automatic with Vercel)
- [ ] Configure custom domain
- [ ] Set up database backups
- [ ] Add monitoring (Sentry, LogRocket)
- [ ] Test webhook delivery
- [ ] Print QR codes for entrances
- [ ] Train staff on scanning
- [ ] Create admin accounts for owners

## Troubleshooting

### Payment Not Completing

- Check Razorpay keys are correct
- Verify signature validation is working
- Check browser console for errors
- Test with Razorpay test cards

### QR Not Validating

- Ensure QR_SECRET is same in all environments
- Check system time is synchronized
- Verify booking payment status is SUCCESS
- Check if QR was already used

### Database Connection Fails

- Verify DATABASE_URL format
- Check database server is running
- Ensure Prisma schema is pushed
- Try `npx prisma db push` again

## Support

Issues: [GitHub Issues](https://github.com/skuppuraj/cinepark-parking-system/issues)
