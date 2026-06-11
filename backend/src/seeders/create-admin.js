/**
 * Create or reset the first ADMIN user (development / bootstrap).
 *
 * 1. Add to backend/.env:
 *    SEED_ADMIN_EMAIL=you@example.com
 *    SEED_ADMIN_PASSWORD=YourPassw0rd!   (min 8 chars; matches User model)
 * 2. Run: npm run seed:admin
 *
 * If the email already exists as ADMIN, password and status are updated.
 * If the email exists with another role, the script exits with an error.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');
const { ROLES, USER_STATUS } = require('../config/constants');

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error(
      'Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in backend/.env.\n' +
        'Add them, then run: npm run seed:admin'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('SEED_ADMIN_PASSWORD must be at least 8 characters (User model).');
    process.exit(1);
  }

  await connectDB();

  let user = await User.findOne({ email });
  if (user) {
    if (user.role !== ROLES.ADMIN) {
      console.error(`User "${email}" exists with role "${user.role}", not ADMIN. Use another email or change role in MongoDB.`);
      process.exit(1);
    }
    user.password = password;
    user.status = USER_STATUS.ACTIVE;
    user.isEmailVerified = true;
    await user.save();
    console.log(`✓ Updated admin: ${email} (password reset, ACTIVE, email verified)`);
  } else {
    const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
    if (adminCount >= 1) {
      console.error(
        'An ADMIN user already exists. Only one admin is allowed.\n' +
          'To reset that admin’s password, set SEED_ADMIN_EMAIL to their email and run npm run seed:admin again.'
      );
      process.exit(1);
    }
    await User.create({
      name: 'Admin',
      email,
      password,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
    });
    console.log(`✓ Created admin: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
