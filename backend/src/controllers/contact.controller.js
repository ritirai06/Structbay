const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { sendContactFormEmail } = require('../services/email.service');
const logger = require('../config/logger');

/**
 * Submit contact form
 * POST /api/v1/contact
 */
const submitContactForm = asyncHandler(async (req, res) => {
  const { name, phone, email, subject, message } = req.body;

  // Validation
  if (!name || !name.trim()) return ApiResponse.badRequest(res, 'Name is required.');
  if (!email || !email.trim()) return ApiResponse.badRequest(res, 'Email is required.');
  if (!phone || !phone.trim()) return ApiResponse.badRequest(res, 'Phone is required.');
  if (!subject || !subject.trim()) return ApiResponse.badRequest(res, 'Subject is required.');
  if (!message || !message.trim()) return ApiResponse.badRequest(res, 'Message is required.');

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return ApiResponse.badRequest(res, 'Invalid email address.');
  }

  try {
    // Send email to admin
    const adminEmail = process.env.CONTACT_FORM_EMAIL || process.env.SMTP_FROM || 'hello@structbay.com';
    
    await sendContactFormEmail({
      to: adminEmail,
      name: name.trim(),
      fromEmail: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    logger.info(`Contact form submitted by ${name} (${email})`);
    return ApiResponse.success(res, 200, 'Your message has been sent successfully. We will get back to you shortly.');
  } catch (err) {
    logger.error(`Contact form submission error: ${err.message}`);
    return ApiResponse.error(res, 500, 'Failed to send message. Please try again later.');
  }
});

module.exports = {
  submitContactForm,
};
