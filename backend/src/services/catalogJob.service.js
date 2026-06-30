const fs = require('fs').promises;
const path = require('path');
const GeneratedCatalog = require('../models/GeneratedCatalog');
const catalogResolve = require('./catalogResolve.service');
const catalogRender = require('./catalogRender.service');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'catalogs');

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function defaultCatalogName(scopeType) {
  const map = {
    ALL: 'Structbay Master Product Catalog',
    SELECTED: 'Structbay — Selected products',
    CATEGORY: 'Structbay — Category catalog',
    BRAND: 'Structbay — Brand catalog',
    PRODUCT: 'Structbay — Product sheet',
    VENDOR: 'Structbay — Vendor catalog',
  };
  return map[scopeType] || 'Structbay Product Catalog';
}

async function unlinkSafe(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

async function deleteStoredFile(job) {
  if (!job?.storedFileName) return;
  await unlinkSafe(path.join(UPLOAD_DIR, job.storedFileName));
}

/**
 * Background catalog render: resolve products → bundles → file on disk.
 */
async function runCatalogJob(jobId) {
  const job = await GeneratedCatalog.findById(jobId);
  if (!job || job.status !== 'QUEUED') return;

  await GeneratedCatalog.updateOne({ _id: job._id }, { $set: { status: 'PROCESSING' } });

  const payload = job.payloadSummary && typeof job.payloadSummary === 'object' ? job.payloadSummary : {};
  const filters = job.filters && typeof job.filters === 'object' ? job.filters : {};
  const options = job.options && typeof job.options === 'object' ? job.options : {};

  try {
    const { products, truncated } = await catalogResolve.resolveCatalogProducts({
      scopeType: job.scopeType,
      productId: payload.productId,
      productIds: payload.productIds,
      categoryId: payload.categoryId,
      brandId: payload.brandId,
      vendorUserId: payload.vendorUserId,
      filters,
    });

    const bundles = await catalogResolve.buildCatalogBundles(products, options);

    const coverMeta = {
      generatedByName: job.generatedByName,
      totalProducts: products.length,
      version: job.version || 1,
      truncated,
    };

    const buf = await catalogRender.renderCatalogBuffer(job.format, {
      bundles,
      catalogName: job.catalogName,
      coverMeta,
      options,
    });

    await ensureUploadDir();
    const ext = catalogRender.extensionForFormat(job.format);
    const fn = `catalog-${job._id}.${ext}`;
    const fullPath = path.join(UPLOAD_DIR, fn);
    await fs.writeFile(fullPath, buf);

    const rows = catalogRender.flatRowsFromBundles(bundles, options.includePricing !== false);

    await GeneratedCatalog.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'COMPLETED',
          storedFileName: fn,
          fileSizeBytes: buf.length,
          productCount: products.length,
          rowCount: rows.length,
          errorMessage: null,
        },
      }
    );
  } catch (e) {
    await GeneratedCatalog.updateOne(
      { _id: job._id },
      { $set: { status: 'FAILED', errorMessage: (e && e.message) || String(e) } }
    );
  }
}

function enqueueCatalogJob(jobId) {
  setImmediate(() => {
    runCatalogJob(jobId).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[catalogJob]', jobId, err);
    });
  });
}

module.exports = {
  UPLOAD_DIR,
  ensureUploadDir,
  defaultCatalogName,
  runCatalogJob,
  enqueueCatalogJob,
  deleteStoredFile,
};
