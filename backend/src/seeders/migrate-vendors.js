require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

async function migrate() {
  await connectDB();
  console.log('Database connected. Starting vendor migration...');

  // 1. Migrate Vendor users in User collection
  const users = await User.find({ role: 'VENDOR' });
  let userCount = 0;
  for (const u of users) {
    let modified = false;
    if (u.companyAddress === undefined || u.companyAddress === null) {
      u.companyAddress = null;
      modified = true;
    }
    if (u.warehouseAddress === undefined || u.warehouseAddress === null) {
      u.warehouseAddress = null;
      modified = true;
    }
    if (u.contactPersonName === undefined || u.contactPersonName === null) {
      u.contactPersonName = u.contactPerson || u.name || null;
      modified = true;
    }
    if (u.contactPersonPhone === undefined || u.contactPersonPhone === null) {
      u.contactPersonPhone = u.phone || null;
      modified = true;
    }
    if (u.cancelledChequeFile === undefined || u.cancelledChequeFile === null) {
      u.cancelledChequeFile = null;
      modified = true;
    }
    if (u.bankDetails) {
      if (u.bankDetails.branchName === undefined || u.bankDetails.branchName === null) {
        u.bankDetails.branchName = u.bankDetails.branch || null;
        modified = true;
      }
      if (u.bankDetails.cancelledChequeFile === undefined || u.bankDetails.cancelledChequeFile === null) {
        u.bankDetails.cancelledChequeFile = null;
        modified = true;
      }
    } else {
      u.bankDetails = {
        accountHolderName: null,
        accountNumber: null,
        ifscCode: null,
        bankName: null,
        branch: null,
        branchName: null,
        cancelledChequeFile: null
      };
      modified = true;
    }

    if (modified) {
      await u.save({ validateBeforeSave: false });
      userCount++;
    }
  }
  console.log(`Migrated ${userCount} vendor users in User collection.`);

  // 2. Migrate legacy Vendor collection
  const vendors = await Vendor.find({});
  let vendorCount = 0;
  for (const v of vendors) {
    let modified = false;
    if (v.companyAddress === undefined || v.companyAddress === null) {
      v.companyAddress = null;
      modified = true;
    }
    if (v.warehouseAddress === undefined || v.warehouseAddress === null) {
      v.warehouseAddress = null;
      modified = true;
    }
    if (v.contactPersonName === undefined || v.contactPersonName === null) {
      v.contactPersonName = v.contactPerson || null;
      modified = true;
    }
    if (v.contactPersonPhone === undefined || v.contactPersonPhone === null) {
      v.contactPersonPhone = v.phone || null;
      modified = true;
    }
    if (v.cancelledChequeFile === undefined || v.cancelledChequeFile === null) {
      v.cancelledChequeFile = null;
      modified = true;
    }
    if (v.bankDetails) {
      if (v.bankDetails.branchName === undefined || v.bankDetails.branchName === null) {
        v.bankDetails.branchName = v.bankDetails.branch || null;
        modified = true;
      }
      if (v.bankDetails.cancelledChequeFile === undefined || v.bankDetails.cancelledChequeFile === null) {
        v.bankDetails.cancelledChequeFile = null;
        modified = true;
      }
    } else {
      v.bankDetails = {
        accountHolderName: null,
        accountNumber: null,
        ifscCode: null,
        bankName: null,
        branch: null,
        branchName: null,
        cancelledChequeFile: null
      };
      modified = true;
    }

    if (modified) {
      await v.save();
      vendorCount++;
    }
  }
  console.log(`Migrated ${vendorCount} legacy vendors in Vendor collection.`);
  console.log('Vendor migration complete.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
