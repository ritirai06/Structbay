const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Product = require('../models/Product');
const colourSearchService = require('../services/colourSearch.service');

const searchColours = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { q, limit = 50, skip = 0 } = req.query;

  if (!productId) throw new AppError('productId is required.', 400);
  if (!q || String(q).trim().length === 0) {
    throw new AppError('Search query (q) is required.', 400);
  }

  const product = await Product.findById(productId).select('_id').lean();
  if (!product) throw new AppError('Product not found.', 404);

  const result = await colourSearchService.searchColours(q, {
    productId,
    limit: Math.min(100, parseInt(limit) || 50),
    skip: Math.max(0, parseInt(skip) || 0),
  });

  return ApiResponse.success(res, 200, 'Colours retrieved.', result);
});

const getProductColours = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) throw new AppError('productId is required.', 400);

  const product = await Product.findById(productId).select('_id').lean();
  if (!product) throw new AppError('Product not found.', 404);

  const colours = await colourSearchService.getProductColours(productId, {
    limit: 1000,
  });

  return ApiResponse.success(res, 200, 'Product colours retrieved.', { colours });
});

const findVariationsByColour = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { colourName, limit = 100, skip = 0 } = req.query;

  if (!productId) throw new AppError('productId is required.', 400);
  if (!colourName || String(colourName).trim().length === 0) {
    throw new AppError('colourName query parameter is required.', 400);
  }

  const product = await Product.findById(productId).select('_id').lean();
  if (!product) throw new AppError('Product not found.', 404);

  const variations = await colourSearchService.findVariationsByColour(
    productId,
    colourName,
    {
      limit: Math.min(100, parseInt(limit) || 100),
      skip: Math.max(0, parseInt(skip) || 0),
    }
  );

  return ApiResponse.success(res, 200, 'Variations retrieved.', { variations });
});

module.exports = {
  searchColours,
  getProductColours,
  findVariationsByColour,
};
