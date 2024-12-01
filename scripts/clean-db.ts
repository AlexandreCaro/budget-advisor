import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Delete all records in reverse order of dependencies
  await prisma.expense.deleteMany({})
  await prisma.tripPlan.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.user.deleteMany({})
  
  console.log('Database cleaned')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 