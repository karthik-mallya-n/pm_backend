/**
 * This script promotes a user to admin role
 * 
 * Run this script with:
 * node src/scripts/make-admin.js user@example.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('Error: Email is required');
      console.log('Usage: node make-admin.js your-email@example.com');
      process.exit(1);
    }

    console.log(`Attempting to promote ${email} to admin role...`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Error: No user found with email ${email}`);
      process.exit(1);
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: {
        name: true,
        email: true,
        role: true
      }
    });

    console.log('Successfully updated user:');
    console.log(updatedUser);
    console.log('\nYou can now login with this account and have admin privileges.');

  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
