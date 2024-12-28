import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUsers() {
  try {
    // Clear existing users
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
      {
        email: 'user@example.com',
        password: hashedPassword,
        firstName: 'Regular',
        lastName: 'User',
        role: 'USER',
      }
    ];

    await prisma.user.createMany({
      data: users
    });

    console.log('Users seeded successfully');
  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seed function
seedUsers(); 