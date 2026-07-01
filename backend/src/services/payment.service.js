const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const { sendPaymentSuccessEmail, sendPaymentFailedEmail } = require('./email.service');
const { notifyPaymentSuccess, notifyPaymentFailed } = require('./communication.service');
const logger = require('../config/logger');

class PaymentService {
  /**
   * Process a mock payment to simulate payment gateway behavior.
   * Replace the body of this method with real Zoho / Razorpay / PayU webhook logic later.
   *
   * @param {string} orderId  - MongoDB _id of the master order
   * @param {'SUCCESS'|'FAILED'} status
   */
  async processMockPayment(orderId, status) {
    const order = await Order.findById(orderId).populate('customer', 'name email');
    if (!order) {
      throw new Error('Order not found');
    }

    const timestamp = new Date();

    // ── Generate a fake transaction ID (replace with real provider ID later) ──
    const transactionId =
      status === 'SUCCESS'
        ? `TXN-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
        : null;

    const paymentStatus = status === 'SUCCESS' ? 'PAID' : 'FAILED';

    // ── Create transaction record ─────────────────────────────────────────────
    const transaction = await PaymentTransaction.create({
      masterOrder:   order._id,
      customer:      order.customer,
      amount:        order.grandTotal,
      currency:      'INR',
      provider:      'Mock Payment Gateway',
      providerTxnId: transactionId,
      status:        paymentStatus,
      paymentMethod: 'Online Payment',
      paidAt:        status === 'SUCCESS' ? timestamp : null,
    });

    // ── Update order ──────────────────────────────────────────────────────────
    order.paymentTransactionId = transaction._id;
    order.paymentStatus        = paymentStatus;
    order.paymentMethod        = 'Online Payment';

    if (status === 'SUCCESS') {
      const prevStatus = order.status;
      // Move to PROCESSING only if currently in early stages
      if (['PENDING', 'PAID', 'VENDOR_ASSIGNMENT_PENDING'].includes(order.status)) {
        order.status = 'VENDOR_ASSIGNMENT_PENDING';
      }
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status:    order.status,
        changedBy: order.customer?._id || order.customer,
        note:      `Payment received (Txn: ${transactionId})`,
      });
    } else {
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status:    order.status,
        changedBy: order.customer?._id || order.customer,
        note:      'Payment attempt failed.',
      });
    }

    await order.save();

    // ── Send email notifications (non-blocking) ───────────────────────────────
    const customerEmail = order.customer?.email;
    const customerName  = order.customer?.name || 'Customer';

    if (customerEmail) {
      if (status === 'SUCCESS') {
        sendPaymentSuccessEmail({
          to:            customerEmail,
          name:          customerName,
          orderNumber:   order.orderNumber,
          amount:        order.grandTotal,
          transactionId: transactionId || '',
          orderId:       String(order._id),
        }).catch(err => logger.error(`Payment success email failed: ${err.message}`));

        notifyPaymentSuccess({
          to:   { email: customerEmail },
          vars: {
            customerName,
            orderNumber:   order.orderNumber,
            amount:        `₹${order.grandTotal?.toLocaleString('en-IN')}`,
            transactionId: transactionId || '',
            orderId:       String(order._id),
          },
          recipientRef: order._id,
        }).catch(() => {});
      } else {
        sendPaymentFailedEmail({
          to:          customerEmail,
          name:        customerName,
          orderNumber: order.orderNumber,
          amount:      order.grandTotal,
          orderId:     String(order._id),
        }).catch(err => logger.error(`Payment failed email error: ${err.message}`));
      }
    }

    return transaction;
  }
}

module.exports = new PaymentService();
