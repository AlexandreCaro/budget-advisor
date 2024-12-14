const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient()

async function main() {
  try {
    // Test connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connected successfully');

    // Count users
    const userCount = await prisma.user.count();
    console.log('Total users:', userCount);

    // Count trips
    const tripCount = await prisma.tripPlan.count();
    console.log('Total trips:', tripCount);

    // Get sample data
    const sampleTrip = await prisma.tripPlan.findFirst({
      include: {
        expenses: true,
        departureLocation: true
      }
    });
    console.log('Sample trip:', sampleTrip);

  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 