const crypto = require('crypto');
const logger = require('../config/logger');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const { sendPaymentSuccessEmail, sendPaymentFailedEmail, sendRefundCompletedEmail } = require('../services/email.service');
const { notifyPaymentSuccess } = require('../services/communication.service');
const { logOrderActivity } = require('../services/order.service');

/**
 * Verify Zoho Webhook Signature.
 * Zoho signs the raw request body with HMAC-SHA256.
 * They may send the digest as base64 OR hex depending on the account region.
 * We check both to be safe.
 */
const verifyZohoSignature = (rawBody, signatureHeader, secretKey) => {
  if (!signatureHeader || !secretKey) return false;
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(rawBody, 'utf8');
  const base64Sig = hmac.digest('base64');
  const hexSig    = crypto.createHmac('sha256', secretKey).update(rawBody, 'utf8').digest('hex');
  return base64Sig === signatureHeader || hexSig === signatureHeader;
};

exports.handleWebhook = async (req, res) => {
  // ── Zoho requires acknowledgement within 15 seconds ──
  // Set a safety timeout that responds 200 if business logic hangs.
  let responded = false;
  const safetyTimer = setTimeout(() => {
    if (!responded) {
      responded = true;
      logger.error('Zoho Webhook: Handler took >14s — sending 200 timeout fallback.');
      res.status(200).send('OK: Timeout fallback');
    }
  }, 14000);

  const done = (code, msg) => {
    if (!responded) {
      responded = true;
      clearTimeout(safetyTimer);
      res.status(code).send(msg);
    }
  };

  try {
    // ── Raw body (captured in app.js verify callback) ──
    // Fallback: if rawBody not set (e.g. GET health probe), use JSON.stringify
    const rawBody = req.rawBody || (req.body ? JSON.stringify(req.body) : null);
    if (!rawBody) {
      logger.warn('Zoho Webhook: No raw body found.');
      return done(400, 'Bad Request: Missing raw body');
    }

    const useSandbox = process.env.USE_ZOHO_SANDBOX === 'true';
    // Support both the old and new naming conventions
    const secretKey = useSandbox
      ? process.env.ZOHO_SANDBOX_WEBHOOK_SECRET
      : (process.env.ZOHO_LIVE_SIGNING_KEY || process.env.ZOHO_LIVE_WEBHOOK_SECRET);

    if (!secretKey) {
      // Secret not configured yet — log prominently but still ACK so Zoho
      // doesn't retry indefinitely while the secret is being set up.
      logger.error(
        `Zoho Webhook: ${useSandbox ? 'ZOHO_SANDBOX_WEBHOOK_SECRET' : 'ZOHO_LIVE_SIGNING_KEY'} ` +
        'is not set in .env. Configure it from the Zoho Payments Dashboard → Webhooks → Secret.'
      );
      return done(200, 'OK: Webhook received (signature check skipped — secret not configured)');
    }

    // ── Signature header — Zoho uses different header names ──
    const rawSig =
      req.headers['x-zoho-webhook-signature'] ||
      req.headers['x-zohopay-signature'] ||
      req.headers['x-zoho-signature'] ||
      req.headers['authorization'] ||
      '';

    // Strip any prefix like "Zoho-webhook-signature "
    const cleanSignature = rawSig.startsWith('Zoho-webhook-signature ')
      ? rawSig.replace('Zoho-webhook-signature ', '').trim()
      : rawSig;

    // Debug log (remove after confirming signature works)
    logger.info(`Zoho Webhook: event received, sig header=[${cleanSignature ? cleanSignature.slice(0, 12) + '...' : 'MISSING'}]`);

    if (!verifyZohoSignature(rawBody, cleanSignature, secretKey)) {
      logger.warn('Zoho Webhook: Invalid signature.');
      if (!useSandbox) {
        return done(401, 'Unauthorized: Invalid Signature');
      }
      logger.warn('Zoho Webhook: Bypassing signature check for Sandbox (USE_ZOHO_SANDBOX=true).');
    }

    const payload = JSON.parse(rawBody); // parse it manually since we use rawBody
    const eventType = payload.event_type;
    
    // Zoho Payments typically nests the actual object inside event_object.payment or event_object.payment_links
    let data = payload;
    if (payload.event_object) {
        data = payload.event_object.payment || payload.event_object.payment_links || payload.event_object;
    }

    logger.info(`Zoho Webhook Received: Event [${eventType}], Payment ID [${data.payment_id || data.payment_link_id || data.id}]`);

    // Handle Payment Success Event
    if (['payment.success', 'payment_success', 'payment.succeeded', 'payment_link.paid'].includes(eventType)) {
      const transactionId = data.payment_id || data.id || data.transaction_id || data.payment_link_id;
      const orderRef = data.reference_id || data.custom_data?.order_id || data.description?.match(/Order (\d+)/)?.[1];
      const amountPaid = parseFloat(data.amount);

      if (!orderRef) {
         logger.warn(`Zoho Webhook: No order reference found in payment ${transactionId}`);
         return done(200, 'OK: Ignored');
      }

      // Idempotency check: see if transaction already exists and is PAID
      const existingTxn = await PaymentTransaction.findOne({ providerTxnId: transactionId });
      if (existingTxn && existingTxn.status === 'PAID') {
        logger.info(`Zoho Webhook: Payment ${transactionId} already processed (Idempotent).`);
        return done(200, 'OK: Already processed');
      }

      const order = await Order.findOne({ $or: [{ orderNumber: orderRef }, { _id: orderRef.length === 24 ? orderRef : null }] }).populate('customer', 'name email');
      
      if (!order) {
        logger.error(`Zoho Webhook: Order ${orderRef} not found.`);
      return done(200, 'OK: Order not found');
      }

      // Amount verification (allow minor precision differences)
      if (Math.abs(order.grandTotal - amountPaid) > 1) {
        logger.warn(`Zoho Webhook: Amount mismatch for order ${orderRef}. Expected ${order.grandTotal}, got ${amountPaid}`);
        // We still record the transaction but flag it
      }

      // Record transaction
      const transaction = await PaymentTransaction.create({
        masterOrder: order._id,
        customer: order.customer,
        amount: amountPaid,
        currency: data.currency || 'INR',
        provider: 'Zoho Payments',
        providerTxnId: transactionId,
        status: 'PAID',
        paymentMethod: data.payment_method || 'Online Payment',
        paidAt: new Date(),
        rawPayload: payload // Store raw payload for audit
      });

      // Update Order
      order.paymentTransactionId = transaction._id;
      order.paymentStatus = 'PAID';
      order.paymentMethod = 'Online Payment';

      if (['PENDING', 'PAID', 'VENDOR_ASSIGNMENT_PENDING'].includes(order.status)) {
        order.status = 'VENDOR_ASSIGNMENT_PENDING';
      }
      
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: order.status,
        changedBy: order.customer?._id || order.customer,
        note: `Zoho Payment received (Txn: ${transactionId})`,
      });

      await order.save();
      
      await logOrderActivity({
        masterOrder: order._id, actorType: 'SYSTEM', actor: null,
        action: 'PAYMENT_RECEIVED', description: `Payment ${transactionId} verified via Zoho Webhook.`
      });

      // Send emails
      const customerEmail = order.customer?.email;
      const customerName = order.customer?.name || 'Customer';
      if (customerEmail) {
        sendPaymentSuccessEmail({
          to: customerEmail,
          name: customerName,
          orderNumber: order.orderNumber,
          amount: order.grandTotal,
          transactionId: transactionId,
          orderId: String(order._id),
        }).catch(err => logger.error(`Email error: ${err.message}`));
      }

      return done(200, 'OK: Payment Processed');

    }

    // Handle Payment Failed Event
    if (['payment.failed', 'payment_failed'].includes(eventType)) {
       // Similar structure, log failure, update order paymentStatus to FAILED
       const transactionId = data.payment_id || data.id;
       const orderRef = data.reference_id || data.custom_data?.order_id || data.description?.match(/Order (\d+)/)?.[1];
       
       if (orderRef) {
         const order = await Order.findOne({ $or: [{ orderNumber: orderRef }, { _id: orderRef.length === 24 ? orderRef : null }] });
         if (order) {
            order.statusHistory.push({
              status: order.status,
              changedBy: null,
              note: `Zoho Payment attempt failed. (Txn: ${transactionId})`,
            });
            await order.save();
         }
       }
       return done(200, 'OK: Failure Processed');
    }

    // Handle Refund Events
    if (['refund.success', 'refund_success', 'refund.completed', 'refund_completed', 'payment.refunded'].includes(eventType)) {
       const transactionId = data.payment_id || data.id || data.transaction_id;
       const orderRef = data.reference_id || data.custom_data?.order_id || data.description?.match(/Order (\d+)/)?.[1];
       const parentPaymentId = data.parent_payment_id || data.payment_id;
       
       let order = null;
       if (orderRef) {
          order = await Order.findOne({ $or: [{ orderNumber: orderRef }, { _id: orderRef.length === 24 ? orderRef : null }] }).populate('customer', 'name email');
       }
       if (!order && parentPaymentId) {
          const existingTxn = await PaymentTransaction.findOne({ providerTxnId: parentPaymentId });
          if (existingTxn) {
             order = await Order.findById(existingTxn.masterOrder).populate('customer', 'name email');
          }
       }

       if (order) {
          if (order.paymentStatus !== 'REFUNDED') {
              order.paymentStatus = 'REFUNDED';
              order.statusHistory.push({
                status: order.status,
                changedBy: null,
                note: `Zoho Refund processed. (Refund ID: ${data.refund_id || transactionId})`,
              });
              await order.save();
              
              const refundAmount = data.amount || order.grandTotal;

              if (order.paymentTransactionId) {
                 await PaymentTransaction.findByIdAndUpdate(order.paymentTransactionId, {
                    status: 'REFUNDED',
                    refundAmount: refundAmount,
                    refundedAt: new Date(),
                    refundReference: data.refund_id || transactionId
                 });
              }

              if (order.customer?.email) {
                sendRefundCompletedEmail({
                  to: order.customer.email,
                  name: order.customer.name || 'Customer',
                  orderNumber: order.orderNumber,
                  amount: refundAmount,
                  transactionId: data.refund_id || transactionId
                }).catch(err => logger.error(`Refund Email error: ${err.message}`));
              }
          }
       }
       return done(200, 'OK: Refund Processed');
    }

    // Default response for unhandled events
    return done(200, 'OK: Event ignored');

  } catch (error) {
    logger.error(`Zoho Webhook Error: ${error.message}`, { stack: error.stack });
    // Return 500 so Zoho retries on transient errors (DB down, etc.)
    return done(500, 'Internal Server Error');
  }
};
