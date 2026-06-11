const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const City = require('../models/City');
const { logAction } = require('../services/auditLog.service');
const { generateRefNumber } = require('../services/refNumber.service');

/** Split comma/newline/space separated PINs into unique 6-digit strings. */
function normalizePincodes(input) {
  if (input == null) return [];
  const parts = Array.isArray(input) ? input : String(input).split(/[\s,;]+/);
  const out = [];
  const seen = new Set();
  for (const p of parts) {
    const d = String(p).replace(/\D/g, '').slice(0, 6);
    if (d.length === 6 && !seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}

async function assertPincodesUnique(pincodes, excludeId) {
  if (!pincodes.length) return;
  const q = { isDeleted: false, pincodes: { $in: pincodes } };
  if (excludeId) q._id = { $ne: excludeId };
  const other = await City.findOne(q).select('name pincodes').lean();
  if (other) {
    const clash = pincodes.find((pin) => (other.pincodes || []).includes(pin));
    throw new AppError(
      `PIN code ${clash} is already linked to ${other.name}. Remove it from that city first or use a different list.`,
      422
    );
  }
}

const getAll = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 100 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, parseInt(limit));
  const [cities, total] = await Promise.all([
    City.find(filter).sort({ sortOrder: 1, name: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    City.countDocuments(filter),
  ]);
  return ApiResponse.success(res, 200, 'Cities retrieved.', cities, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

const getById = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new AppError('City not found.', 404);
  return ApiResponse.success(res, 200, 'City retrieved.', city);
});

const create = asyncHandler(async (req, res) => {
  const { name, state, status, isServiceable, priority, sortOrder, pincodes: rawPins } = req.body;
  const pincodes = normalizePincodes(rawPins);
  await assertPincodesUnique(pincodes, null);
  const referenceNumber = await generateRefNumber('CITY');
  const city = await City.create({
    name,
    state,
    status,
    isServiceable,
    priority,
    sortOrder,
    pincodes,
    referenceNumber,
    createdBy: req.user._id,
  });
  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'City',
    targetId: city._id.toString(),
    description: `Created city: ${city.name}`,
    ipAddress: req.ip,
  });
  return ApiResponse.created(res, 'City created.', city);
});

const update = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new AppError('City not found.', 404);
  const allowed = ['name', 'state', 'status', 'isServiceable', 'priority', 'sortOrder'];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) city[f] = req.body[f];
  });
  if (req.body.pincodes !== undefined) {
    const pincodes = normalizePincodes(req.body.pincodes);
    await assertPincodesUnique(pincodes, city._id);
    city.pincodes = pincodes;
  }
  await city.save();
  await logAction({
    adminId: req.user._id,
    action: 'UPDATE',
    module: 'City',
    targetId: city._id.toString(),
    description: `Updated city: ${city.name}`,
    ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'City updated.', city);
});

const toggle = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new AppError('City not found.', 404);
  city.status = city.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await city.save();
  return ApiResponse.success(res, 200, `City ${city.status.toLowerCase()}.`, city);
});

const remove = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new AppError('City not found.', 404);
  city.isDeleted = true;
  await city.save({ validateBeforeSave: false });
  await logAction({
    adminId: req.user._id,
    action: 'DELETE',
    module: 'City',
    targetId: city._id.toString(),
    description: `Deleted city: ${city.name}`,
    ipAddress: req.ip,
  });
  return ApiResponse.success(res, 200, 'City deleted.');
});

const BULK_MAX_ROWS = 200;

function bulkCityRowError(e) {
  if (e instanceof AppError) return e.message;
  if (e?.code === 11000) return 'Duplicate city or reference.';
  return e?.message || String(e);
}

const bulkImport = asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) throw new AppError('rows must be an array.', 400);
  if (!rows.length) throw new AppError('rows cannot be empty.', 400);
  if (rows.length > BULK_MAX_ROWS) {
    throw new AppError(`Too many rows (max ${BULK_MAX_ROWS}).`, 400);
  }

  const batchId = new mongoose.Types.ObjectId().toString();
  const errors = [];
  let ok = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const r = typeof row === 'object' && row !== null ? row : {};
      const name = String(r.name || '').trim();
      const state = String(r.state || '').trim();
      if (!name || !state) throw new AppError('name and state are required.', 400);
      const pincodes = normalizePincodes(r.pincodes || r.pins || r.pin_codes || '');
      const status = ['ACTIVE', 'INACTIVE'].includes(String(r.status || 'ACTIVE').toUpperCase())
        ? String(r.status || 'ACTIVE').toUpperCase()
        : 'ACTIVE';
      const rawServ = r.isServiceable ?? r.serviceable ?? 'true';
      const isServiceable = !['false', '0', 'no', 'n'].includes(String(rawServ).toLowerCase().trim());
      const priority =
        r.priority !== undefined && r.priority !== '' && Number.isFinite(Number(r.priority))
          ? Number(r.priority)
          : 0;
      const sortOrder =
        r.sortOrder !== undefined && r.sortOrder !== '' && Number.isFinite(Number(r.sortOrder))
          ? Number(r.sortOrder)
          : 0;

      await assertPincodesUnique(pincodes, null);
      const referenceNumber = await generateRefNumber('CITY');
      await City.create({
        name,
        state,
        status,
        isServiceable,
        priority,
        sortOrder,
        pincodes,
        referenceNumber,
        createdBy: req.user._id,
      });
      ok += 1;
    } catch (e) {
      errors.push({ row: i + 1, message: bulkCityRowError(e) });
    }
  }

  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'City',
    targetId: batchId,
    description: `Bulk city import: ${ok} succeeded, ${errors.length} failed (${rows.length} rows)`,
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, 200, 'Bulk import completed.', {
    batchId,
    total: rows.length,
    succeeded: ok,
    failed: errors.length,
    errors,
  });
});

module.exports = { getAll, getById, create, update, toggle, remove, bulkImport };
