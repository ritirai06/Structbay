const nodemailer = require('nodemailer');
const logger = require('../config/logger');

/** dotenv does not trim values — `KEY= value` leaves a leading space. */
const trim = (v) => (typeof v === 'string' ? v.trim() : v || '');

// ─── Transporter ────────────────────────────────────────────────────────────
/**
 * Builds nodemailer transport from env (preferred order):
 * 1. SMTP_HOST + (SMTP_USER|GMAIL_USER) + (SMTP_PASS|GMAIL_PASS)
 * 2. service "gmail" + GMAIL_USER + GMAIL_PASS when SMTP_HOST is unset
 * Returns null if not configured (sendEmail no-ops with a log).
 */
const buildTransporter = () => {
  const host = trim(process.env.SMTP_HOST);
  const smtpUser = trim(process.env.SMTP_USER);
  const smtpPass = trim(process.env.SMTP_PASS);
  const gmailUser = trim(process.env.GMAIL_USER);
  const gmailPass = trim(process.env.GMAIL_PASS);
  const authUser = smtpUser || gmailUser;
  const authPass = smtpPass || gmailPass;

  if (host && authUser && authPass) {
    const port = parseInt(String(trim(process.env.SMTP_PORT) || '587'), 10) || 587;
    const secure = String(trim(process.env.SMTP_SECURE)).toLowerCase() === 'true';
    // Gmail SMTP only accepts Google-hosted addresses; Zoho/custom domains need their provider's host.
    if (/gmail\.com/i.test(host) && !/@(gmail\.com|googlemail\.com)$/i.test(authUser)) {
      logger.warn(
        `SMTP_HOST looks like Gmail (${host}) but SMTP_USER is ${authUser}. ` +
          'Use your mail provider SMTP (e.g. smtp.zoho.in for Zoho Mail India), not smtp.gmail.com, or verification emails will never send.'
      );
    }
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: authUser, pass: authPass },
      requireTLS: !secure && port === 587,
    });
  }

  if (authUser && authPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: authUser, pass: authPass },
    });
  }

  logger.warn(
    'Email is not configured. Set SMTP_HOST + SMTP_USER + SMTP_PASS (and SMTP_FROM), or GMAIL_USER + GMAIL_PASS.'
  );
  return null;
};

/** Fresh transporter each send — avoids stale SMTP after .env changes without server restart. */
const getTransporter = () => buildTransporter();

const defaultFrom = () => {
  const from = trim(process.env.SMTP_FROM) || trim(process.env.SMTP_USER) || trim(process.env.GMAIL_USER);
  return from || 'noreply@structbay.local';
};

// ─── Base Sender ─────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(`Email skipped (not configured): would send to ${to} — ${subject}`);
    return null;
  }

  try {
    const fromAddr = defaultFrom();
    const mail = {
      from: `"Structbay" <${fromAddr}>`,
      to,
      subject,
      html,
    };
    if (text) mail.text = text;
    const info = await transporter.sendMail(mail);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    const extra = err.responseCode ? ` SMTP ${err.responseCode}` : '';
    logger.error(`Email send failed to ${to}: ${err.message}${extra}`);
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
      &copy; ${new Date().getFullYear()} Structbay. All rights reserved.<br />
      India's B2B Construction Material Marketplace
    </div>
  </div>
</body>
</html>`;

// ─── Email: Verify Email ──────────────────────────────────────────────────────
const sendVerificationEmail = async ({ to, name, token }) => {
  const base = trim(process.env.FRONTEND_URL) || 'http://localhost:3000';
  const url = `${base.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
  const info = await sendEmail({
    to,
    subject: 'Verify your Structbay account',
    text: `Hi ${name},\n\nVerify your Structbay account (link expires in 24 hours):\n${url}\n\nIf you did not register, ignore this email.`,
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to Structbay! Please verify your email address to activate your account.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <div class="warning">This link expires in <strong>24 hours</strong>.</div>
      <p>If you didn't create an account, please ignore this email.</p>
    `),
  });
  if (!info) {
    logger.warn(
      `Verification email was NOT delivered (SMTP misconfigured or provider rejected). Check server logs for "Email send failed". Recipient: ${to}`
    );
  }
  return info;
};

// ─── Email: Forgot Password ───────────────────────────────────────────────────
const sendPasswordResetEmail = async ({ to, name, token }) => {
  const base = trim(process.env.FRONTEND_URL) || 'http://localhost:3000';
  const url = `${base.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to,
    subject: 'Reset your Structbay password',
    text: `Hi ${name},\n\nReset your Structbay password (link expires in 1 hour):\n${url}\n\nIf you did not request this, ignore this email.`,
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
    subject: 'Vendor Application Received – Structbay',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for applying to become a vendor on Structbay!</p>
      <p>Your application for <strong>${companyName}</strong> has been received and is currently under review.</p>
      <p>Our team will verify your documents and notify you within <strong>2-3 business days</strong>.</p>
      <p>If you have any questions, please contact <a href="mailto:vendor@structbay.com">vendor@structbay.com</a>.</p>
    `),
  });
};

// ─── Email: Vendor Approved ───────────────────────────────────────────────────
const sendVendorApprovedEmail = async ({ to, name, companyName }) => {
  const base = trim(process.env.VENDOR_URL) || trim(process.env.FRONTEND_URL) || 'http://localhost:3000';
  const loginUrl = `${base.replace(/\/$/, '')}/vendor/login`;
  return sendEmail({
    to,
    subject: '🎉 Vendor Account Approved – Structbay',
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
    subject: 'Vendor Application Update – Structbay',
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
  const base = trim(process.env.FRONTEND_URL) || 'http://localhost:3000';
  const shopUrl = base.replace(/\/$/, '');
  return sendEmail({
    to,
    subject: 'Welcome to Structbay!',
    html: baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to <strong>Structbay</strong> – India's B2B Construction Material Marketplace!</p>
      <p>Your account is now active. Start exploring thousands of construction materials from trusted vendors.</p>
      <a href="${shopUrl}" class="btn">Start Shopping</a>
    `),
  });
};

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ─── Email: Contact form (homepage) ───────────────────────────────────────────
const sendContactFormEmail = async ({ to, name, fromEmail, subject, message }) => {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(fromEmail);
  const safeSubject = escapeHtml(subject || 'Structbay enquiry');
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(`Contact form skipped (SMTP not configured). From: ${fromEmail}`);
    return null;
  }

  try {
    const fromAddr = defaultFrom();
    const mail = {
      from: `"Structbay" <${fromAddr}>`,
      to,
      replyTo: fromEmail,
      subject: `[Contact] ${subject || 'Structbay enquiry'}`,
      text: `Name: ${name}\nEmail: ${fromEmail}\nSubject: ${subject || 'Structbay enquiry'}\n\n${message}`,
      html: baseTemplate(`
        <p><strong>New contact form message</strong></p>
        <p><strong>Name:</strong> ${safeName}<br />
        <strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a><br />
        <strong>Subject:</strong> ${safeSubject}</p>
        <p style="white-space:pre-wrap;line-height:1.6">${safeMessage}</p>
        <p style="font-size:12px;color:#888">Reply directly to this email to reach the customer.</p>
      `),
    };
    const info = await transporter.sendMail(mail);
    logger.info(`Contact form email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    const extra = err.responseCode ? ` SMTP ${err.responseCode}` : '';
    logger.error(`Contact form email failed to ${to}: ${err.message}${extra}`);
    return null;
  }
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVendorApplicationEmail,
  sendVendorApprovedEmail,
  sendVendorRejectedEmail,
  sendWelcomeEmail,
  sendContactFormEmail,
};
