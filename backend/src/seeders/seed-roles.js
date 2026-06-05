/**
 * seed-roles.js
 * Populates roles and permissions collections.
 * Run: node src/seeders/seed-roles.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('../config/permissions');
const connectDB = require('../config/db');

const PERMISSION_META = [
  { name: PERMISSIONS.READ_OWN_PROFILE,          resource: 'user',    action: 'read',   description: 'Read own profile' },
  { name: PERMISSIONS.UPDATE_OWN_PROFILE,         resource: 'user',    action: 'update', description: 'Update own profile' },
  { name: PERMISSIONS.DELETE_OWN_ACCOUNT,         resource: 'user',    action: 'delete', description: 'Deactivate own account' },
  { name: PERMISSIONS.CHANGE_OWN_PASSWORD,        resource: 'user',    action: 'update', description: 'Change own password' },
  { name: PERMISSIONS.READ_ALL_USERS,             resource: 'admin',   action: 'read',   description: 'Admin: list all users' },
  { name: PERMISSIONS.UPDATE_USER_STATUS,         resource: 'admin',   action: 'update', description: 'Admin: update user status' },
  { name: PERMISSIONS.DELETE_USER,                resource: 'admin',   action: 'delete', description: 'Admin: delete user' },
  { name: PERMISSIONS.READ_ALL_VENDORS,           resource: 'admin',   action: 'read',   description: 'Admin: list all vendors' },
  { name: PERMISSIONS.APPROVE_VENDOR,             resource: 'admin',   action: 'update', description: 'Admin: approve vendor' },
  { name: PERMISSIONS.REJECT_VENDOR,              resource: 'admin',   action: 'update', description: 'Admin: reject vendor' },
  { name: PERMISSIONS.READ_ALL_SESSIONS,          resource: 'admin',   action: 'read',   description: 'Admin: view all sessions' },
  { name: PERMISSIONS.ACCESS_VENDOR_DASHBOARD,    resource: 'vendor',  action: 'read',   description: 'Access vendor dashboard' },
  { name: PERMISSIONS.MANAGE_OWN_PRODUCTS,        resource: 'vendor',  action: 'create', description: 'Manage own products' },
  { name: PERMISSIONS.ACCESS_CUSTOMER_DASHBOARD,  resource: 'customer',action: 'read',   description: 'Access customer dashboard' },
  { name: PERMISSIONS.PLACE_ORDER,                resource: 'order',   action: 'create', description: 'Place an order' },
  { name: PERMISSIONS.READ_PRODUCTS,              resource: 'product', action: 'read',   description: 'Browse product catalogue' },
];

const seed = async () => {
  await connectDB();

  const permMap = {};
  for (const p of PERMISSION_META) {
    const doc = await Permission.findOneAndUpdate(
      { name: p.name },
      p,
      { upsert: true, new: true, runValidators: true }
    );
    permMap[p.name] = doc._id;
  }

  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const permIds = permNames.map((n) => permMap[n]).filter(Boolean);
    await Role.findOneAndUpdate(
      { name: roleName },
      { name: roleName, description: `${roleName} role`, permissions: permIds, isActive: true },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`✓ Seeded: ${roleName} (${permIds.length} permissions)`);
  }

  console.log('✅ Seed complete.');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
