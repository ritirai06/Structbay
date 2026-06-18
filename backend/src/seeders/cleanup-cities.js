/**
 * Removes soft-deleted city records and rebuilds partial unique indexes.
 * Run: node src/seeders/cleanup-cities.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const City = require('../models/City');

async function run() {
  await connectDB();
  const col = mongoose.connection.collection('cities');

  const ghostCount = await col.countDocuments({ isDeleted: true });
  console.log(`Found ${ghostCount} soft-deleted city record(s).`);

  if (ghostCount > 0) {
    const result = await col.deleteMany({ isDeleted: true });
    console.log(`Hard-deleted ${result.deletedCount} ghost city record(s).`);
  }

  try {
    await City.syncIndexes();
    console.log('City indexes synced (partial unique on name/slug for active cities only).');
  } catch (e) {
    console.warn('Index sync warning (may need manual drop of old name_1/slug_1 indexes):', e.message);
  }

  const active = await col.countDocuments({ isDeleted: { $ne: true } });
  console.log(`Active cities remaining: ${active}`);

  const names = await col
    .find({ isDeleted: { $ne: true } }, { projection: { name: 1, state: 1, status: 1 } })
    .sort({ name: 1 })
    .toArray();
  if (names.length) {
    console.log('Current cities:');
    names.forEach((c) => console.log(`  - ${c.name} (${c.state || '—'}) [${c.status || 'ACTIVE'}]`));
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
