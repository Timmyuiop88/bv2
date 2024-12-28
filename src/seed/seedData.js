const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function seedUsers() {
  try {
    // Clear existing users
    await User.deleteMany({});

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      },
      {
        email: 'user@example.com',
        password: hashedPassword,
        firstName: 'Regular',
        lastName: 'User',
        role: 'user',
      },
      // Add more test users as needed
    ];

    await User.insertMany(users);
    console.log('Users seeded successfully');
  } catch (error) {
    console.error('Error seeding users:', error);
  }
}

module.exports = { seedUsers }; 