const VendorNotification = require('../models/VendorNotification');
const User = require('../models/User');
const { sendEmail } = require('./email.service');

/**
 * Create a vendor notification (in-app + optional email).
 */
async function notifyVendor({ vendorId, type, title, message, priority = 'normal', relatedOrder, relatedInvoice, relatedDispatch, actionUrl, actionLabel, metadata, createdBy }) {
  const notif = await VendorNotification.create({
    vendor: vendorId,
    type, title, message, priority,
    relatedOrder, relatedInvoice, relatedDispatch,
    actionUrl, actionLabel, metadata, createdBy,
    channels: { email: { sent: false }, sms: { sent: false } },
  });

  // Send email if vendor has email notifications enabled
  try {
    const vendor = await User.findById(vendorId).select('email name companyName notifications').lean();
    if (vendor?.notifications?.email !== false) {
      await sendEmail({
        to: vendor.email,
        subject: `StructBay: ${title}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#FE5E00;">${title}</h2>
            <p style="color:#333;">${message}</p>
            ${actionUrl ? `<a href="${process.env.VENDOR_URL}${actionUrl}" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#FE5E00;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">${actionLabel || 'View Details'}</a>` : ''}
            <hr style="margin-top:32px;border-color:#eee;">
            <p style="font-size:12px;color:#999;">StructBay Vendor Portal — Do not reply to this email.</p>
          </div>
        `,
      });
      await VendorNotification.findByIdAndUpdate(notif._id, { 'channels.email.sent': true, 'channels.email.sentAt': new Date() });
    }
  } catch { /* non-blocking — email failure does not break the flow */ }

  return notif;
}

/**
 * Bulk notify — e.g. admin announcements.
 */
async function notifyAllVendors({ type, title, message, priority = 'normal', createdBy }) {
  const vendors = await User.find({ role: 'VENDOR', vendorStatus: 'APPROVED' }).select('_id').lean();
  const docs = vendors.map(v => ({
    vendor: v._id,
    type, title, message, priority, createdBy,
    channels: { email: { sent: false } },
  }));
  return VendorNotification.insertMany(docs, { ordered: false });
}

module.exports = { notifyVendor, notifyAllVendors };
