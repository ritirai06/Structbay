const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const Project = require('../models/Project');
const Order = require('../models/Order');

exports.createProject = asyncHandler(async (req, res) => {
  const { name, description, location, budget, expectedCompletionDate } = req.body;
  if (!name) throw new AppError('Project name is required', 400);

  const project = await Project.create({
    customer: req.user._id,
    name,
    description,
    location,
    budget,
    expectedCompletionDate,
  });

  return ApiResponse.created(res, 'Project created successfully', project);
});

exports.getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ customer: req.user._id }).sort({ createdAt: -1 }).lean();

  // Calculate analytics for each project
  const projectIds = projects.map(p => p._id);
  
  const orderStats = await Order.aggregate([
    { $match: { customer: req.user._id, project: { $in: projectIds }, isDeleted: false, status: { $ne: 'CANCELLED' } } },
    {
      $group: {
        _id: '$project',
        totalOrders: { $sum: 1 },
        totalSpend: { $sum: '$grandTotal' },
        totalProducts: { $sum: { $size: '$items' } }
      }
    }
  ]);

  const statsMap = orderStats.reduce((acc, stat) => {
    acc[stat._id.toString()] = stat;
    return acc;
  }, {});

  const enrichedProjects = projects.map(p => {
    const stats = statsMap[p._id.toString()] || { totalOrders: 0, totalSpend: 0, totalProducts: 0 };
    return { ...p, ...stats };
  });

  return ApiResponse.success(res, 200, 'Projects retrieved successfully', enrichedProjects);
});

exports.getProjectDetails = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, customer: req.user._id }).lean();
  if (!project) throw new AppError('Project not found', 404);

  const orders = await Order.find({ project: project._id, isDeleted: false })
    .sort({ createdAt: -1 })
    .select('orderNumber grandTotal status createdAt items')
    .lean();

  const totalOrders = orders.filter(o => o.status !== 'CANCELLED').length;
  const totalSpend = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalProducts = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + (o.items?.length || 0), 0);

  return ApiResponse.success(res, 200, 'Project details retrieved', {
    ...project,
    orders,
    totalOrders,
    totalSpend,
    totalProducts,
  });
});

exports.updateProject = asyncHandler(async (req, res) => {
  const { name, description, location, budget, expectedCompletionDate, status } = req.body;
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { name, description, location, budget, expectedCompletionDate, status },
    { new: true, runValidators: true }
  );
  if (!project) throw new AppError('Project not found', 404);
  return ApiResponse.success(res, 200, 'Project updated', project);
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { isDeleted: true },
    { new: true }
  );
  if (!project) throw new AppError('Project not found', 404);
  
  // Unassign orders from this project
  await Order.updateMany({ project: project._id }, { project: null });

  return ApiResponse.success(res, 200, 'Project deleted', null);
});

exports.assignOrder = asyncHandler(async (req, res) => {
  const { orderId, projectId } = req.body;
  
  const order = await Order.findOne({ _id: orderId, customer: req.user._id });
  if (!order) throw new AppError('Order not found', 404);

  if (projectId) {
    const project = await Project.findOne({ _id: projectId, customer: req.user._id });
    if (!project) throw new AppError('Project not found', 404);
  }

  order.project = projectId || null;
  await order.save();

  return ApiResponse.success(res, 200, 'Order assigned to project successfully', order);
});

exports.bulkAssignOrders = asyncHandler(async (req, res) => {
  const { orderIds, projectId } = req.body;
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new AppError('orderIds must be a non-empty array', 400);
  }

  if (projectId) {
    const project = await Project.findOne({ _id: projectId, customer: req.user._id });
    if (!project) throw new AppError('Project not found', 404);
  }

  await Order.updateMany(
    { _id: { $in: orderIds }, customer: req.user._id },
    { project: projectId || null }
  );

  return ApiResponse.success(res, 200, 'Orders assigned to project successfully', null);
});
