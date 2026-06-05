const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { changePasswordValidator } = require('../validators/auth.validator');
const { updateProfileValidator } = require('../validators/user.validator');

router.use(protect);

router.get('/me',              userController.getProfile);
router.put('/me',              updateProfileValidator, validate, userController.updateProfile);
router.put('/change-password', changePasswordValidator, validate, userController.changePassword);
router.delete('/deactivate',   userController.deactivateAccount);

module.exports = router;
