const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB connected');

    const email = 'admin@structbay.com';
    const password = 'Admin@123';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`✗ Admin with email ${email} already exists`);
      process.exit(0);
    }

    // Create admin - password will be hashed by pre-save hook
    const admin = await User.create({
      email,
      password, // Plain text - model will hash it
      name: 'Admin User',
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
    });

    console.log('✓ Admin created successfully');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  ID: ${admin._id}`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
