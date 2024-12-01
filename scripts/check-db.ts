import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check all users
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      sessions: true
    }
  })
  
  console.log('Users:', JSON.stringify(users, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 