const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const GeneratedCatalog = require('../models/GeneratedCatalog');
const catalogExport = require('../services/catalogExport.service');
const { logAction } = require('../services/auditLog.service');

function scopeLabelFromBody(scope, body) {
  if (scope === 'CUSTOM') return `Custom (${(body.productIds || []).length} ids)`;
  return scope;
}

exports.exportCatalog = asyncHandler(async (req, res) => {
  const {
    scope,
    format = 'csv',
    productId,
    categoryId,
    brandId,
    vendorUserId,
    productIds,
  } = req.body;

  const exportOpts = {
    scope,
    format: format === 'html' ? 'html' : 'csv',
    productId,
    categoryId,
    brandId,
    vendorUserId,
    productIds,
  };

  const { body, filename, mime, rowCount, truncated, title } = await catalogExport.buildExport(exportOpts);

  try {
    await GeneratedCatalog.create({
      createdBy: req.user._id,
      scopeType: scope,
      scopeLabel: title || scopeLabelFromBody(scope, req.body),
      format: exportOpts.format,
      rowCount,
      meta: {
        productId: productId || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        vendorUserId: vendorUserId || undefined,
        productIdsCount: Array.isArray(productIds) ? productIds.length : undefined,
        truncated,
      },
    });
  } catch {
    /* ignore */
  }

  await logAction({
    adminId: req.user._id,
    action: 'CREATE',
    module: 'CatalogExport',
    description: `Generated ${exportOpts.format.toUpperCase()} catalog (${scope}), ${rowCount} rows`,
    ipAddress: req.ip,
    newData: { scope, format: exportOpts.format, rowCount, truncated },
  });

  if (truncated) res.setHeader('X-Structbay-Catalog-Truncated', 'true');
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
  return res.status(200).send(body);
});

exports.listCatalogHistory = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    GeneratedCatalog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean(),
    GeneratedCatalog.countDocuments(),
  ]);

  return ApiResponse.success(res, 200, 'Catalog export history.', rows, {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  });
});
