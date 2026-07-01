const paymentService = require('../services/payment.service');

exports.simulateMockPayment = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    
    if (!orderId || !status) {
      return res.status(400).json({ success: false, message: 'orderId and status are required' });
    }

    if (!['SUCCESS', 'FAILED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const transaction = await paymentService.processMockPayment(orderId, status);
    
    res.status(200).json({
      success: true,
      message: `Payment simulated as ${status}`,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
