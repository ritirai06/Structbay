const express = require('express');
const router = express.Router();
const projectController = require('../../controllers/project.controller');
const { protect } = require('../../middleware/auth.middleware');

router.use(protect); // All project routes require customer to be logged in

router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectDetails);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

router.post('/assign-order', projectController.assignOrder);
router.post('/bulk-assign-orders', projectController.bulkAssignOrders);

module.exports = router;
