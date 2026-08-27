const crypto = require('crypto');
const logger = require('../config/logger');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const { sendPaymentSuccessEmail, sendPaymentFailedEmail } = require('../services/email.service');
const { notifyPaymentSuccess } = require('../services/communication.service');
const { logOrderActivity } = require('../services/order.service');

// Verify Zoho Webhook Signature
const verifyZohoSignature = (rawBody, signatureHeader, secretKey) => {
  if (!signatureHeader || !secretKey) return false;
  
  // Zoho typically uses HMAC SHA256 base64 encoded
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(rawBody, 'utf8');
  const generatedSignature = hmac.digest('base64');
  
  return generatedSignature === signatureHeader;
};

exports.handleWebhook = async (req, res) => {
  try {
    const rawBody = req.rawBody;
    if (!rawBody) {
      logger.warn('Zoho Webhook: No raw body found.');
      return res.status(400).send('Bad Request: Missing raw body');
    }

    const useSandbox = process.env.USE_ZOHO_SANDBOX === 'true';
    const secretKey = useSandbox ? process.env.ZOHO_SANDBOX_WEBHOOK_SECRET : process.env.ZOHO_LIVE_WEBHOOK_SECRET;
    
    if (!secretKey) {
      logger.error('Zoho Webhook: Secret key not configured in .env');
      return res.status(500).send('Internal Server Error');
    }

    // Common headers Zoho might use for signatures
    const signature = req.headers['x-zoho-webhook-signature'] || req.headers['x-zoho-signature'] || req.headers['x-zohopay-signature'] || req.headers['authorization'];
    
    // Debug logging for signatures
    logger.warn(`Zoho Webhook Headers: ${JSON.stringify(req.headers)}`);
    const generatedSig = crypto.createHmac('sha256', secretKey).update(rawBody, 'utf8').digest('base64');
    logger.warn(`Zoho Webhook Signature received: ${signature}`);
    logger.warn(`Zoho Webhook Signature expected: ${generatedSig}`);

    // If authorization header has a prefix like "Zoho-webhook-signature "
    let cleanSignature = signature;
    if (signature && signature.startsWith('Zoho-webhook-signature ')) {
        cleanSignature = signature.replace('Zoho-webhook-signature ', '').trim();
    }
    
    if (!verifyZohoSignature(rawBody, cleanSignature, secretKey)) {
      logger.warn('Zoho Webhook: Invalid signature detected.');
      // Temporary bypass for sandbox testing if the user wants it to work immediately while we debug
      if (!useSandbox) {
         return res.status(401).send('Unauthorized: Invalid Signature');
      } else {
         logger.warn('Zoho Webhook: Bypassing signature check for Sandbox debugging.');
      }
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
         return res.status(200).send('OK: Ignored');
      }

      // Idempotency check: see if transaction already exists and is PAID
      const existingTxn = await PaymentTransaction.findOne({ providerTxnId: transactionId });
      if (existingTxn && existingTxn.status === 'PAID') {
        logger.info(`Zoho Webhook: Payment ${transactionId} already processed (Idempotent).`);
        return res.status(200).send('OK: Already processed');
      }

      const order = await Order.findOne({ $or: [{ orderNumber: orderRef }, { _id: orderRef.length === 24 ? orderRef : null }] }).populate('customer', 'name email');
      
      if (!order) {
        logger.error(`Zoho Webhook: Order ${orderRef} not found.`);
        return res.status(200).send('OK: Order not found');
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

      return res.status(200).send('OK: Payment Processed');
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
       return res.status(200).send('OK: Failure Processed');
    }

    // Default response for unhandled events
    return res.status(200).send('OK: Event ignored');

  } catch (error) {
    logger.error(`Zoho Webhook Error: ${error.message}`);
    // Always return 200 for internal errors after catching, so Zoho doesn't infinitely retry unless we want it to.
    // Actually, returning 500 tells Zoho to retry. Depending on the error, retry might be good (e.g. DB down).
    return res.status(500).send('Internal Server Error');
  }
};
