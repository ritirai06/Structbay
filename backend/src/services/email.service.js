const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// ─── Transporter ────────────────────────────────────────────────────────────
const createTransporter = () => {
  // Use SMTP (production) or Ethereal (dev fallback)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Gmail shorthand
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // App password
    },
  });
};

const transporter = createTransporter();

// ─── Base Sender ─────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"StructBay" <${process.env.SMTP_FROM || process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email send failed to ${to}: ${err.message}`);
    // Do NOT throw — email failure should not crash auth flow
    return null;
  }
};

// ─── Email Templates ──────────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #1a3c5e; padding: 24px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header span { color: #f5a623; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .btn { display: inline-block; background: #1a3c5e; color: #fff !important; padding: 12px 28px;
           border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { background: #f4f4f4; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
    .warning { background: #fff3cd; border-left: 4px solid #f5a623; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Struct<span>Bay</span></h1>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} StructBay. All rights reserved.<br />
      India's B2B Construction Material Marketplace
    </div>
  </div>
</body>
</html>`;

// ─── Email: Verify Email ──────────────────────────────────────────────────────
const sendVerificationEmail = async ({ to, name, token }) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: 'Verify your StructBay account',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to StructBay! Please verify your email address to activate your account.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <div class="warning">This link expires in <strong>24 hours</strong>.</div>
      <p>If you didn't create an account, please ignore this email.</p>
    `),
  });
};

// ─── Email: Forgot Password ───────────────────────────────────────────────────
const sendPasswordResetEmail = async ({ to, name, token }) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: 'Reset your StructBay password',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>You requested to reset your password. Click the button below to set a new password.</p>
      <a href="${url}" class="btn">Reset Password</a>
      <div class="warning">This link expires in <strong>1 hour</strong>. Do not share this link.</div>
      <p>If you didn't request a password reset, please secure your account immediately.</p>
    `),
  });
};

// ─── Email: Vendor Application Received ──────────────────────────────────────
const sendVendorApplicationEmail = async ({ to, name, companyName }) => {
  return sendEmail({
    to,
    subject: 'Vendor Application Received – StructBay',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for applying to become a vendor on StructBay!</p>
      <p>Your application for <strong>${companyName}</strong> has been received and is currently under review.</p>
      <p>Our team will verify your documents and notify you within <strong>2-3 business days</strong>.</p>
      <p>If you have any questions, please contact <a href="mailto:vendor@structbay.com">vendor@structbay.com</a>.</p>
    `),
  });
};

// ─── Email: Vendor Approved ───────────────────────────────────────────────────
const sendVendorApprovedEmail = async ({ to, name, companyName }) => {
  const loginUrl = `${process.env.FRONTEND_URL}/vendor/login`;
  return sendEmail({
    to,
    subject: '🎉 Vendor Account Approved – StructBay',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Congratulations! Your vendor account for <strong>${companyName}</strong> has been <strong>approved</strong>.</p>
      <p>You can now log in to your vendor dashboard and start managing your orders.</p>
      <a href="${loginUrl}" class="btn">Access Vendor Dashboard</a>
    `),
  });
};

// ─── Email: Vendor Rejected ───────────────────────────────────────────────────
const sendVendorRejectedEmail = async ({ to, name, companyName, reason }) => {
  return sendEmail({
    to,
    subject: 'Vendor Application Update – StructBay',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>We regret to inform you that your vendor application for <strong>${companyName}</strong> has not been approved at this time.</p>
      ${reason ? `<div class="warning"><strong>Reason:</strong> ${reason}</div>` : ''}
      <p>If you believe this is an error or would like to reapply, please contact <a href="mailto:vendor@structbay.com">vendor@structbay.com</a>.</p>
    `),
  });
};

// ─── Email: Welcome (Customer) ────────────────────────────────────────────────
const sendWelcomeEmail = async ({ to, name }) => {
  const shopUrl = `${process.env.FRONTEND_URL}`;
  return sendEmail({
    to,
    subject: 'Welcome to StructBay!',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to <strong>StructBay</strong> – India's B2B Construction Material Marketplace!</p>
      <p>Your account is now active. Start exploring thousands of construction materials from trusted vendors.</p>
      <a href="${shopUrl}" class="btn">Start Shopping</a>
    `),
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVendorApplicationEmail,
  sendVendorApprovedEmail,
  sendVendorRejectedEmail,
  sendWelcomeEmail,
};
