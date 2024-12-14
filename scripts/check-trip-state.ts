const prisma = new (require('@prisma/client').PrismaClient)();

async function checkTripState() {
  const tripId = 'cm4mpcv9x0cykus17ov4kwlxn';
  
  try {
    console.log('\n=== Trip Plan ===');
    const trip = await prisma.tripPlan.findUnique({
      where: { id: tripId },
      include: {
        departureLocation: true,
        expenses: true,
        estimate_history: true
      }
    });
    console.log(JSON.stringify(trip, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTripState(); 