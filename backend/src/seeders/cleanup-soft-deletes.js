/**
 * Hard-deletes ghost soft-deleted records and syncs partial unique indexes.
 * Run after deploying soft-delete field release + partial index changes.
 *
 *   node src/seeders/cleanup-soft-deletes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');

const COLLECTIONS = [
  { name: 'categories', model: () => require('../models/Category') },
  { name: 'brands', model: () => require('../models/Brand') },
  { name: 'cities', model: () => require('../models/City') },
  { name: 'products', model: () => require('../models/Product') },
  { name: 'productvariations', model: () => require('../models/ProductVariation') },
  { name: 'citypricings', model: () => require('../models/CityPricing') },
  { name: 'inventories', model: () => require('../models/Inventory') },
];

async function run() {
  await connectDB();
  const db = mongoose.connection.db;

  for (const { name, model } of COLLECTIONS) {
    const col = db.collection(name);
    const ghostCount = await col.countDocuments({ isDeleted: true });
    console.log(`[${name}] ${ghostCount} soft-deleted record(s).`);

    if (ghostCount > 0) {
      const result = await col.deleteMany({ isDeleted: true });
      console.log(`[${name}] Hard-deleted ${result.deletedCount} ghost record(s).`);
    }

    try {
      await model().syncIndexes();
      console.log(`[${name}] Indexes synced.`);
    } catch (e) {
      console.warn(`[${name}] Index sync warning:`, e.message);
    }

    const active = await col.countDocuments({ isDeleted: { $ne: true } });
    console.log(`[${name}] Active records: ${active}\n`);
  }

  // Users: release emails on deleted accounts still blocking unique index
  const usersCol = db.collection('users');
  const deletedUsers = await usersCol
    .find({ status: 'DELETED', email: { $not: /^deleted\+__deleted__/ } })
    .project({ _id: 1, email: 1 })
    .toArray();

  if (deletedUsers.length) {
    console.log(`[users] Fixing ${deletedUsers.length} deleted user email(s) for reuse.`);
    for (const u of deletedUsers) {
      const tag = `__deleted__${u._id}`;
      const newEmail = `deleted+${tag}+${String(u.email).toLowerCase()}`.slice(0, 320);
      await usersCol.updateOne({ _id: u._id }, { $set: { email: newEmail } });
    }
  }

  try {
    const User = require('../models/User');
    await User.syncIndexes();
    console.log('[users] Indexes synced.');
  } catch (e) {
    console.warn('[users] Index sync warning:', e.message);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
