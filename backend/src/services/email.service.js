/**
 * StructBay — Enterprise Email Notification Service
 *
 * Architecture:
 *   getEmailBranding()        → loads company details from CMS (dynamic, never hardcoded)
 *   masterTemplate()          → single responsive HTML template for ALL emails
 *   send*Email()              → one function per email type (21 types)
 *
 * Sender: always the configured SMTP_FROM / SMTP_USER / GMAIL_USER from .env
 * Branding: always from Admin CMS footer settings
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const EmailQueue = require('../models/EmailQueue');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** dotenv does not trim values — trim manually */
const trim = (v) => (typeof v === 'string' ? v.trim() : v || '');

/** Escape HTML special characters */
const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Interpolate {{variable}} placeholders */
const interpolate = (text = '', vars = {}) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{{${k}}}`));

// ─── Transporter ──────────────────────────────────────────────────────────────

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
    if (/gmail\.com/i.test(host) && !/@(gmail\.com|googlemail\.com)$/i.test(authUser)) {
      logger.warn(
        `SMTP_HOST looks like Gmail (${host}) but SMTP_USER is ${authUser}. ` +
        'Use your mail provider SMTP host (e.g. smtp.zoho.in), not smtp.gmail.com.'
      );
    }
    return nodemailer.createTransport({
      host, port, secure,
      auth: { user: authUser, pass: authPass },
      requireTLS: !secure && port === 587,
    });
  }

  if (authUser && authPass) {
    return nodemailer.createTransport({ service: 'gmail', auth: { user: authUser, pass: authPass } });
  }

  logger.warn('Email is not configured. Set SMTP_HOST + SMTP_USER + SMTP_PASS (and SMTP_FROM), or GMAIL_USER + GMAIL_PASS.');
  return null;
};

const getTransporter = () => buildTransporter();

const defaultFrom = () => {
  const from = trim(process.env.SMTP_FROM) || trim(process.env.SMTP_USER) || trim(process.env.GMAIL_USER);
  return from || '';
};

// ─── Dynamic Branding from CMS ────────────────────────────────────────────────

const fs = require('fs');

/**
 * Loads company branding from the CMS footer settings.
 * Returns sensible defaults if CMS is not reachable.
 * Nothing is hardcoded — all values come from Admin Settings.
 */
const getEmailBranding = async () => {
  const frontendUrl = trim(process.env.FRONTEND_URL) || 'https://structbay.com';
  const base = frontendUrl.replace(/\/$/, '');
  
  const logoUrl = base.includes('localhost')
    ? 'https://res.cloudinary.com/dr3bbkrv7/image/upload/v1784408107/structbay/assets/Structbay-Logo-F-1_n88bxz.png'
    : `${base}/shared/assets/logos/Structbay-Logo-F-1.png`;

  const exactDesc = "Your Trusted Construction Materials Marketplace";

  try {
    const CMS = require('../models/CMS');
    const cms = await CMS.getOrCreate();
    const footer = cms.footer || {};
    return {
      siteUrl: base,
      companyName: 'StructBay',
      logoUrl: trim(cms.brandLogoUrl) || logoUrl,
      address: trim(footer.address) || 'Vidyaranyapura, Bengaluru',
      phone: trim(footer.phone) || '+91 70905 70505',
      email: trim(footer.email) || 'support@structbay.com',
      copyright: trim(footer.copyrightText) || `© ${new Date().getFullYear()} StructBay. All Rights Reserved.`,
      description: trim(footer.companyDescription) || exactDesc,
      social: {
        facebook: trim(footer.socialLinks?.facebook),
        instagram: trim(footer.socialLinks?.instagram),
        twitter: trim(footer.socialLinks?.twitter),
        linkedin: trim(footer.socialLinks?.linkedin),
        youtube: trim(footer.socialLinks?.youtube),
      },
    };
  } catch (err) {
    logger.warn(`Email branding load failed (using defaults): ${err.message}`);
    return {
      siteUrl: base,
      companyName: 'StructBay',
      logoUrl,
      address: 'Vidyaranyapura, Bengaluru',
      phone: '+91 70905 70505',
      email: 'support@structbay.com',
      copyright: `© ${new Date().getFullYear()} StructBay. All Rights Reserved.`,
      description: exactDesc,
      social: {},
    };
  }
};

// ─── Master Template ──────────────────────────────────────────────────────────

/**
 * One responsive HTML master template used for ALL emails.
 * Compatible with Gmail, Outlook, Apple Mail, Zoho Mail, Yahoo Mail.
 *
 * @param {object} opts
 * @param {string} opts.title         Email subject/title shown in header
 * @param {string} opts.greeting      e.g. "Hi Riti,"
 * @param {string} opts.bodyHtml      Main email content (HTML)
 * @param {object} [opts.cta]         { label, url }
 * @param {object} opts.branding      From getEmailBranding()
 */
const masterTemplate = ({ title, greeting, bodyHtml, cta, branding }) => {
  const { siteUrl, companyName, logoUrl, address, phone, email, copyright, description, social } = branding;

  // Premium Dark Header style. Logo text fallback is highly visible on dark background.
  const logoBlock = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="${esc(companyName)}" style="max-height:40px;max-width:180px;display:block;border:none;outline:none;text-decoration:none;" />`
    : `<span style="font-size:28px;font-weight:900;color:#E85A00;letter-spacing:-1px;font-family:Arial,sans-serif;text-decoration:none;">Struct<span style="color:#ffffff;">Bay</span></span>`;

  const ctaBlock = cta
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:32px auto 16px; width: 100%;"><tr><td align="center">
        <a href="${esc(cta.url)}" target="_blank" style="display:inline-block;padding:14px 48px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;background-color:#E85A00;text-decoration:none;border-radius:6px;letter-spacing:0.5px;">${esc(cta.label)}</a>
       </td></tr></table>` : '';

  const socialIcons = [];
  if (social.facebook && social.facebook !== '#') socialIcons.push(`<a href="${esc(social.facebook)}" style="margin:0 8px;display:inline-block;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="22" height="22" alt="Facebook" style="border:0;display:block;" /></a>`);
  if (social.instagram && social.instagram !== '#') socialIcons.push(`<a href="${esc(social.instagram)}" style="margin:0 8px;display:inline-block;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="22" height="22" alt="Instagram" style="border:0;display:block;" /></a>`);
  if (social.linkedin && social.linkedin !== '#') socialIcons.push(`<a href="${esc(social.linkedin)}" style="margin:0 8px;display:inline-block;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/32/733/733561.png" width="22" height="22" alt="LinkedIn" style="border:0;display:block;" /></a>`);
  if (social.twitter && social.twitter !== '#') socialIcons.push(`<a href="${esc(social.twitter)}" style="margin:0 8px;display:inline-block;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/32/5968/5968830.png" width="22" height="22" alt="Twitter" style="border:0;display:block;" /></a>`);
  if (social.youtube && social.youtube !== '#') socialIcons.push(`<a href="${esc(social.youtube)}" style="margin:0 8px;display:inline-block;text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="22" height="22" alt="YouTube" style="border:0;display:block;" /></a>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; }
  
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
    .header-pad { padding: 20px 24px !important; }
    .body-pad { padding: 24px !important; }
  }
</style>
</head>
<body style="background-color:#f3f4f6; margin:0; padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
    <tr><td align="center" style="padding: 30px 10px;">
      
      <!-- Main Card -->
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border: 1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
        
        <!-- Header (Dark Premium) -->
        <tr><td class="header-pad" style="background-color: #0D0D0D; padding: 24px 32px; text-align: left;">
          <a href="${esc(siteUrl)}" target="_blank" style="text-decoration:none; display:inline-block;">
            ${logoBlock}
          </a>
        </td></tr>

        <!-- Content -->
        <tr><td class="body-pad" style="padding: 40px 32px;">
          ${title ? `<h2 style="margin-top:0; margin-bottom: 24px; font-size: 22px; color: #111827; font-weight: 700;">${esc(title)}</h2>` : ''}
          ${greeting ? `<p style="margin-top:0; margin-bottom: 20px; font-size: 16px; color: #374151; line-height: 1.6;">${esc(greeting)}</p>` : ''}
          
          <div style="font-size: 15px; color: #4B5563; line-height: 1.6;">
            ${bodyHtml}
          </div>

          ${ctaBlock}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color: #f9fafb; padding: 32px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 13px; color: #6b7280; line-height: 1.6;">
          ${socialIcons.length ? `<div style="margin-bottom: 20px;">${socialIcons.join('')}</div>` : ''}
          <p style="margin:0; font-weight: 600; color: #374151;">${esc(companyName)}</p>
          <p style="margin:8px 0 0 0;">${esc(description)}</p>
          <p style="margin:8px 0 0 0;">${esc(address)}</p>
          <p style="margin:8px 0 0 0;"><a href="mailto:${esc(email)}" style="color:#2563eb; text-decoration:none;">${esc(email)}</a> &nbsp;|&nbsp; <a href="tel:${esc(phone)}" style="color:#2563eb; text-decoration:none;">${esc(phone)}</a></p>
          <p style="margin:24px 0 0 0; font-size: 12px; color: #9ca3af;">${esc(copyright)}</p>
        </td></tr>
      </table>

      <!-- Anti-spam note -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-top: 24px;">
          <p style="margin:0; max-width:500px; font-size:12px; color:#9ca3af; text-align:center; line-height:1.5;">
            You received this email because of your activity on ${esc(companyName)}.
            If you did not expect this, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── Core Sender ─────────────────────────────────────────────────────────────

/**
 * Base email sender — uses configured SMTP, never hardcodes addresses.
 */
const sendEmail = async ({ to, subject, html, text, replyTo, priority = 0 }) => {
  try {
    let finalHtml = html;
    if (html && !html.toLowerCase().includes('<html')) {
      const branding = await getEmailBranding();
      finalHtml = masterTemplate({
        title: subject,
        greeting: '',
        bodyHtml: html,
        branding
      });
    }

    const fromAddr = defaultFrom();
    if (!fromAddr) {
      logger.warn(`Email skipped (SMTP_FROM not set): would send to ${to} — ${subject}`);
      return null;
    }
    const job = await EmailQueue.create({
      to,
      subject,
      html: finalHtml,
      text,
      replyTo: replyTo || fromAddr,
      priority
    });
    logger.info(`Email queued to ${to}: ${subject}`);
    
    // Optionally trigger queue processing immediately (non-blocking)
    const { processEmailQueue } = require('../workers/emailWorker');
    processEmailQueue().catch(err => logger.error(`Error triggering queue: ${err.message}`));
    
    return job;
  } catch (err) {
    logger.error(`Failed to queue email to ${to}: ${err.message}`);
    return null;
  }
};

// ─── Typed Email Builders ─────────────────────────────────────────────────────

/**
 * Internal helper — build and send a typed email.
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.title        Header title shown in the orange bar
 * @param {string} params.greeting     e.g. "Hi Priya,"
 * @param {string} params.bodyHtml     Main HTML body (no wrapper needed)
 * @param {object} [params.cta]        { label, url }
 * @param {object} params.vars         Variables for interpolation
 */
const _buildAndSend = async ({ to, subject, title, greeting, bodyHtml, cta, vars = {} }) => {
  const branding = await getEmailBranding();

  // Interpolate vars in all text fields
  const resolvedBodyHtml = interpolate(bodyHtml, vars);
  const resolvedGreeting = interpolate(greeting || '', vars);
  const resolvedTitle = interpolate(title, vars);
  const resolvedSubject = interpolate(subject, vars);
  const resolvedCta = cta ? { label: interpolate(cta.label, vars), url: interpolate(cta.url, vars) } : null;

  const html = masterTemplate({
    title: resolvedTitle,
    greeting: resolvedGreeting,
    bodyHtml: resolvedBodyHtml,
    cta: resolvedCta,
    branding,
  });

  return sendEmail({ to, subject: resolvedSubject, html });
};

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────
const sendWelcomeEmail = async ({ to, name }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: 'Welcome to StructBay!', title: 'Welcome to StructBay 🎉',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>We're thrilled to have you on <strong>StructBay</strong> — India's B2B Construction Material Marketplace!</p>
      <p>Your account is now active. Start exploring thousands of quality construction materials from verified vendors across India.</p>
      <ul style="padding-left:20px;margin:16px 0;">
        <li style="margin-bottom:8px;">✅ Discover products from 100+ trusted vendors</li>
        <li style="margin-bottom:8px;">✅ Get competitive quotes via RFQ</li>
        <li style="margin-bottom:8px;">✅ Manage projects &amp; track orders in one dashboard</li>
        <li style="margin-bottom:8px;">✅ GST-ready invoices for every order</li>
      </ul>`,
    cta: { label: 'Start Shopping', url: branding.siteUrl },
    vars: {},
  });
};



// ─── 2. Email Verification ───────────────────────────────────────────────────
const sendVerificationEmail = async ({ to, name, token }) => {
  const branding = await getEmailBranding();
  const base = branding.siteUrl;
  const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  return _buildAndSend({
    to, subject: 'Verify your StructBay account',
    title: 'Verify Your Email Address',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Thanks for registering on <strong>StructBay</strong>! Before you start, please verify your email address to activate your account.</p>
      <div style="background:#fff8f3;border-left:4px solid #E85A00;padding:14px 18px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#666;">⏳ This verification link expires in <strong>24 hours</strong>.</p>
      </div>
      <p>If you didn't create an account on StructBay, please ignore this email.</p>`,
    cta: { label: 'Verify Email', url },
    vars: {},
  });
};

// ─── 3. Forgot Password ──────────────────────────────────────────────────────
const sendPasswordResetEmail = async ({ to, name, token }) => {
  const branding = await getEmailBranding();
  const url = `${branding.siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return _buildAndSend({
    to, subject: 'Reset your StructBay password',
    title: 'Reset Your Password',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>We received a request to reset the password for your StructBay account.</p>
      <div style="background:#fff8f3;border-left:4px solid #E85A00;padding:14px 18px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#666;">⏳ This reset link expires in <strong>1 hour</strong>. Do not share it with anyone.</p>
      </div>
      <p>If you didn't request a password reset, your account is safe — please ignore this email.</p>`,
    cta: { label: 'Reset Password', url },
    vars: {},
  });
};

// ─── 4. Password Reset Success ───────────────────────────────────────────────
const sendPasswordChangedEmail = async ({ to, name }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: 'Your StructBay password has been changed',
    title: 'Password Updated Successfully',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your StructBay password has been successfully updated.</p>
      <p>If you made this change, you're all set! You can now sign in with your new password.</p>
      <div style="background:#fff8f3;border-left:4px solid #E85A00;padding:14px 18px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#666;">⚠️ If you did <strong>not</strong> change your password, contact us immediately.</p>
      </div>`,
    cta: { label: 'Sign In', url: `${branding.siteUrl}/login` },
    vars: {},
  });
};

// ─── 5. Order Placed ─────────────────────────────────────────────────────────
const sendOrderPlacedEmail = async ({ to, name, orderNumber, amount, subtotal, gstTotal, items = [] }) => {
  const branding = await getEmailBranding();
  const itemsHtml = items.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px 16px; text-align:left; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; border-bottom:1px solid #e5e7eb;">Item</th>
            <th style="padding:12px 16px; text-align:center; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; border-bottom:1px solid #e5e7eb; width:60px;">Qty</th>
            <th style="padding:12px 16px; text-align:right; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; border-bottom:1px solid #e5e7eb; width:100px;">Price</th>
          </tr>
        </thead>
        <tbody>
        ${items.map(i => `
          <tr>
            <td style="padding:16px; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6; font-weight:500;">${esc(i.name)}</td>
            <td style="padding:16px; font-size:14px; color:#4b5563; text-align:center; border-bottom:1px solid #f3f4f6;">${esc(String(i.quantity))}</td>
            <td style="padding:16px; font-size:14px; color:#111827; text-align:right; border-bottom:1px solid #f3f4f6;">₹${Number(i.price || 0).toLocaleString('en-IN')}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#ffffff;">
            <td colspan="2" style="padding:12px 16px; font-size:13px; color:#6b7280; text-align:right;">Subtotal</td>
            <td style="padding:12px 16px; font-size:14px; color:#111827; text-align:right;">₹${Number(subtotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr style="background:#ffffff;">
            <td colspan="2" style="padding:12px 16px; font-size:13px; color:#6b7280; text-align:right; border-bottom:1px solid #e5e7eb;">GST</td>
            <td style="padding:12px 16px; font-size:14px; color:#111827; text-align:right; border-bottom:1px solid #e5e7eb;">₹${Number(gstTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td colspan="2" style="padding:16px; font-size:15px; font-weight:700; color:#111827; text-align:right;">Grand Total</td>
            <td style="padding:16px; font-size:16px; font-weight:700; color:#E85A00; text-align:right;">₹${Number(amount || 0).toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>`
    : `<div style="background:#f9fafb; border:1px solid #e5e7eb; padding:16px; border-radius:8px; font-size:15px; color:#374151; margin:24px 0;">
        Order Total: <strong style="color:#E85A00; font-size:18px; float:right;">₹${Number(amount || 0).toLocaleString('en-IN')}</strong>
      </div>`;

  return _buildAndSend({
    to, subject: `Order Placed — ${orderNumber}`,
    title: 'Order Placed Successfully! 🛒',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your order has been placed successfully on <strong>StructBay</strong>. We're currently preparing it for you.</p>
      
      <div style="background:#f8fafc; border-left:4px solid #3b82f6; padding:16px; margin:24px 0; border-radius:0 8px 8px 0;">
        <p style="margin:0; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">Order Number</p>
        <p style="margin:4px 0 0; font-size:18px; color:#0f172a; font-weight:700;">${esc(orderNumber)}</p>
      </div>

      <h3 style="font-size:16px; color:#111827; margin:32px 0 8px 0; font-weight:600;">Order Summary</h3>
      ${itemsHtml}
      
      <p style="margin-top:24px;">Our team is reviewing your order and a vendor will be assigned shortly. You'll receive a confirmation email once it is confirmed and dispatched.</p>`,
    cta: { label: 'Track Your Order', url: `${branding.siteUrl}/orders/${orderNumber}` },
    vars: {},
  });
};

// ─── 6. Order Confirmed ──────────────────────────────────────────────────────
const sendOrderConfirmedEmail = async ({ to, name, orderNumber, amount, orderId }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Order Confirmed — ${orderNumber}`,
    title: 'Order Confirmed ✅',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Great news! Your order <strong>${esc(orderNumber)}</strong> has been confirmed.</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#166534;">✅ Vendor assigned &amp; processing your order</p>
      </div>
      <p style="font-size:14px;">Order Total: <strong style="color:#E85A00;">₹${Number(amount || 0).toLocaleString('en-IN')}</strong></p>
      <p>You will receive an update when your order is dispatched.</p>`,
    cta: { label: 'View Order', url: `${branding.siteUrl}/orders/${orderId || orderNumber}` },
    vars: {},
  });
};

// ─── 7. Order Processing ─────────────────────────────────────────────────────
const sendOrderProcessingEmail = async ({ to, name, orderNumber, orderId }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Your Order is Being Processed — ${orderNumber}`,
    title: 'Order is Being Processed 🔄',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your order <strong>${esc(orderNumber)}</strong> is now being processed by our vendor team.</p>
      <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#713f12;">⚙️ The vendor is preparing your materials. Dispatch will be scheduled soon.</p>
      </div>
      <p>We'll notify you once your order is dispatched with tracking details.</p>`,
    cta: { label: 'View Order', url: `${branding.siteUrl}/orders/${orderId || orderNumber}` },
    vars: {},
  });
};

// ─── 8. Out for Delivery ─────────────────────────────────────────────────────
const sendOutForDeliveryEmail = async ({ to, name, orderNumber, orderId, deliveryDetails }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Order Out for Delivery — ${orderNumber}`,
    title: 'Out for Delivery 🚚',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Exciting! Your order <strong>${esc(orderNumber)}</strong> is out for delivery!</p>
      <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#1e3a8a;">🚚 Your materials are on their way to your delivery address.</p>
        ${deliveryDetails ? `<p style="margin:10px 0 0;font-size:13px;color:#1e3a8a;">${esc(deliveryDetails)}</p>` : ''}
      </div>
      <p>Please ensure someone is available at the delivery address to receive the materials.</p>`,
    cta: { label: 'Track Order', url: `${branding.siteUrl}/orders/${orderId || orderNumber}` },
    vars: {},
  });
};

// ─── 9. Delivered ────────────────────────────────────────────────────────────
const sendOrderDeliveredEmail = async ({ to, name, orderNumber, orderId }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Order Delivered — ${orderNumber}`,
    title: 'Order Delivered! 🎉',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your order <strong>${esc(orderNumber)}</strong> has been successfully delivered!</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#166534;">✅ Delivery confirmed. We hope you're happy with your purchase.</p>
      </div>
      <p>If you have any issues with the delivered materials, please contact our support team or raise a replacement request from your order details page.</p>
      <p>Thank you for choosing StructBay! </p>`,
    cta: { label: 'Open Dashboard', url: `${branding.siteUrl}/account/orders` },
    vars: {},
  });
};

// ─── 10. Order Cancelled ─────────────────────────────────────────────────────
const sendOrderCancelledEmail = async ({ to, name, orderNumber, reason }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Order Cancelled — ${orderNumber}`,
    title: 'Order Cancelled',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your order <strong>${esc(orderNumber)}</strong> has been cancelled.</p>
      ${reason ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin:16px 0;"><p style="margin:0;font-size:13px;color:#991b1b;"><strong>Reason:</strong> ${esc(reason)}</p></div>` : ''}
      <p>If you have any questions or need assistance, please contact our support team. We're here to help.</p>
      <p>You can continue browsing our catalog and place a new order at any time.</p>`,
    cta: { label: 'Browse Products', url: `${branding.siteUrl}/shop` },
    vars: {},
  });
};

// ─── 11. Payment Successful ──────────────────────────────────────────────────
const sendPaymentSuccessEmail = async ({ to, name, orderNumber, amount, transactionId, orderId }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Payment Confirmed — ${orderNumber}`,
    title: 'Payment Successful ✅',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>We've received your payment for order <strong>${esc(orderNumber)}</strong>. Your order is now being processed.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8f8f8;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:14px 18px;border-bottom:1px solid #eeeeee;">
          <span style="font-size:12px;color:#888;display:block;">Amount Paid</span>
          <strong style="font-size:20px;color:#E85A00;">₹${Number(amount || 0).toLocaleString('en-IN')}</strong>
        </td></tr>
        <tr><td style="padding:14px 18px;border-bottom:1px solid #eeeeee;">
          <span style="font-size:12px;color:#888;display:block;">Order Number</span>
          <strong style="font-size:14px;color:#333;">${esc(orderNumber)}</strong>
        </td></tr>
        ${transactionId ? `<tr><td style="padding:14px 18px;">
          <span style="font-size:12px;color:#888;display:block;">Transaction ID</span>
          <strong style="font-size:13px;color:#555;font-family:monospace;">${esc(transactionId)}</strong>
        </td></tr>` : ''}
      </table>
      <p>Please keep this as your payment receipt.</p>`,
    cta: { label: 'View Order', url: `${branding.siteUrl}/orders/${orderId || orderNumber}` },
    vars: {},
  });
};

// ─── 12. Payment Failed ──────────────────────────────────────────────────────
const sendPaymentFailedEmail = async ({ to, name, orderNumber, amount, orderId }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Payment Failed — ${orderNumber}`,
    title: 'Payment Failed ❌',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Unfortunately, the payment for your order <strong>${esc(orderNumber)}</strong> could not be processed.</p>
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#991b1b;">Amount: <strong>₹${Number(amount || 0).toLocaleString('en-IN')}</strong></p>
      </div>
      <p>This can happen due to:</p>
      <ul style="padding-left:20px;color:#555;font-size:14px;line-height:2;">
        <li>Insufficient balance / credit limit</li>
        <li>Bank server timeout</li>
        <li>Card declined by your bank</li>
      </ul>
      <p>Please try again or contact your bank. Your order is still saved and waiting for payment.</p>`,
    cta: { label: 'Retry Payment', url: `${branding.siteUrl}/orders/${orderId || orderNumber}` },
    vars: {},
  });
};

// ─── 13. RFQ Submitted ───────────────────────────────────────────────────────
const sendRFQSubmittedEmail = async ({ to, name, rfqId, rfqNumber, productName }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `RFQ Submitted — ${rfqNumber || rfqId}`,
    title: 'Request for Quotation Received',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your Request for Quotation has been successfully submitted to StructBay.</p>
      <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 6px;font-size:12px;color:#888;">RFQ Number</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#333;">${esc(rfqNumber || rfqId)}</p>
        ${productName ? `<p style="margin:8px 0 0;font-size:13px;color:#666;">Product: ${esc(productName)}</p>` : ''}
      </div>
      <p>Our procurement team and verified vendors will review your requirements and send you competitive quotations within <strong>24-48 business hours</strong>.</p>
      <p>You can view and manage your RFQs from your dashboard.</p>`,
    cta: { label: 'View RFQ', url: `${branding.siteUrl}/account/rfqs` },
    vars: {},
  });
};

// ─── 14. RFQ Approved ────────────────────────────────────────────────────────
const sendRFQApprovedEmail = async ({ to, name, rfqNumber, rfqId, vendorQuote }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `RFQ Approved — ${rfqNumber || rfqId}`,
    title: 'RFQ Approved! Your Quote is Ready ✅',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your Request for Quotation <strong>${esc(rfqNumber || rfqId)}</strong> has been approved and a quote is ready for your review.</p>
      ${vendorQuote ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;font-size:13px;color:#166534;">💰 Quoted Amount: <strong>₹${Number(vendorQuote).toLocaleString('en-IN')}</strong></p></div>` : ''}
      <p>Please log in to your dashboard to review the quotation and proceed with your order.</p>`,
    cta: { label: 'View RFQ', url: `${branding.siteUrl}/account/rfqs` },
    vars: {},
  });
};

// ─── 15. RFQ Rejected ────────────────────────────────────────────────────────
const sendRFQRejectedEmail = async ({ to, name, rfqNumber, rfqId, reason }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `RFQ Update — ${rfqNumber || rfqId}`,
    title: 'RFQ Could Not Be Processed',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>We regret to inform you that your Request for Quotation <strong>${esc(rfqNumber || rfqId)}</strong> could not be processed at this time.</p>
      ${reason ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin:16px 0;"><p style="margin:0;font-size:13px;color:#991b1b;"><strong>Reason:</strong> ${esc(reason)}</p></div>` : ''}
      <p>You are welcome to submit a new RFQ with updated requirements. Our team is always here to help you source the right materials.</p>`,
    cta: { label: 'Browse Products', url: `${branding.siteUrl}/shop` },
    vars: {},
  });
};

// ─── 16. Bulk Enquiry Submitted ──────────────────────────────────────────────
const sendBulkEnquiryEmail = async ({ to, name, enquiryId }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: 'Bulk Enquiry Received — StructBay',
    title: 'Bulk Enquiry Received',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Thank you for submitting a bulk material enquiry on StructBay!</p>
      ${enquiryId ? `<div style="background:#f8f8f8;border-radius:8px;padding:14px;margin:16px 0;"><p style="margin:0;font-size:12px;color:#888;">Enquiry Reference</p><p style="margin:4px 0 0;font-weight:700;color:#333;">${esc(enquiryId)}</p></div>` : ''}
      <p>Our business development team will review your requirements and one of our executives will contact you within <strong>4-8 business hours</strong> with the best available rates and delivery timelines.</p>
      <p>For urgent requirements, you can also reach us directly via our contact page.</p>`,
    cta: { label: 'Open Dashboard', url: `${branding.siteUrl}/account` },
    vars: {},
  });
};

// ─── 17. Project Created ─────────────────────────────────────────────────────
const sendProjectCreatedEmail = async ({ to, name, projectName }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Project Created — ${projectName}`,
    title: 'New Project Created 🏗️',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your project <strong>${esc(projectName)}</strong> has been successfully created on StructBay.</p>
      <p>You can now:</p>
      <ul style="padding-left:20px;line-height:2;font-size:14px;color:#555;">
        <li>Assign orders to this project for tracking</li>
        <li>Monitor total spend across all orders</li>
        <li>Get a consolidated view of all materials</li>
      </ul>`,
    cta: { label: 'Open Dashboard', url: `${branding.siteUrl}/projects` },
    vars: {},
  });
};

// ─── 18. Project Updated ─────────────────────────────────────────────────────
const sendProjectUpdatedEmail = async ({ to, name, projectName }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: `Project Updated — ${projectName}`,
    title: 'Project Updated',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your project <strong>${esc(projectName)}</strong> has been updated successfully.</p>
      <p>Log in to your dashboard to view the latest project details and track all assigned orders.</p>`,
    cta: { label: 'Open Dashboard', url: `${branding.siteUrl}/projects` },
    vars: {},
  });
};

// ─── 19. Vendor Application Received ────────────────────────────────────────
const sendVendorApplicationEmail = async ({ to, name, companyName }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: 'Vendor Application Received – Structbay',
    title: 'Vendor Application Received',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Thank you for applying to become a vendor on Structbay!</p>
      <p>Your application for <strong>${esc(companyName)}</strong> has been received and is currently under review by our team.</p>
      <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#666;">⏱ Our team typically reviews applications within <strong>2-3 business days</strong>. You'll receive an email notification once a decision is made.</p>
      </div>
      <p>If you have any questions about the process, please contact our vendor support team.</p>`,
    cta: { label: 'Open Dashboard', url: `${branding.siteUrl}/vendor` },
    vars: {},
  });
};

// ─── 20. Vendor Approved ─────────────────────────────────────────────────────
const sendVendorApprovedEmail = async ({ to, name, companyName }) => {
  const branding = await getEmailBranding();
  const loginUrl = `${trim(process.env.VENDOR_URL) || branding.siteUrl}/vendor/login`;
  return _buildAndSend({
    to, subject: '🎉 Vendor Account Approved – Structbay',
    title: 'Vendor Account Approved! 🎉',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Congratulations! Your vendor account for <strong>${esc(companyName)}</strong> has been <strong style="color:#16a34a;">approved</strong>.</p>
      <p>You can now access your Vendor Dashboard to:</p>
      <ul style="padding-left:20px;line-height:2;font-size:14px;color:#555;">
        <li>List your products and manage inventory</li>
        <li>Receive and manage orders from customers</li>
        <li>Track payments and generate invoices</li>
      </ul>`,
    cta: { label: 'Access Vendor Dashboard', url: loginUrl },
    vars: {},
  });
};

// ─── 21. Vendor Rejected ─────────────────────────────────────────────────────
const sendVendorRejectedEmail = async ({ to, name, companyName, reason }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: 'Vendor Application Update – Structbay',
    title: 'Vendor Application Update',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>We regret to inform you that your vendor application for <strong>${esc(companyName)}</strong> has not been approved at this time.</p>
      ${reason ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin:16px 0;"><p style="margin:0;font-size:13px;color:#991b1b;"><strong>Reason:</strong> ${esc(reason)}</p></div>` : ''}
      <p>If you believe this is an error or would like to reapply with additional documentation, please contact our vendor support team.</p>`,
    cta: { label: 'Contact Support', url: `${branding.siteUrl}/contact` },
    vars: {},
  });
};

// ─── 22. Contact Form ────────────────────────────────────────────────────────
const sendContactFormEmail = async ({ to, name, fromEmail, subject, message }) => {
  const branding = await getEmailBranding();
  const safeMessage = esc(message || '').replace(/\n/g, '<br />');
  return _buildAndSend({
    to,
    subject: `[Contact] ${subject || 'New Enquiry'} — from ${name}`,
    title: 'New Contact Form Message',
    greeting: '',
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        <tr><td style="background:#f8f8f8;padding:12px 16px;border-bottom:1px solid #eeeeee;">
          <strong style="font-size:12px;color:#888;display:block;">From</strong>
          <span style="font-size:14px;color:#333;">${esc(name)} &lt;<a href="mailto:${esc(fromEmail)}" style="color:#E85A00;">${esc(fromEmail)}</a>&gt;</span>
        </td></tr>
        <tr><td style="background:#f8f8f8;padding:12px 16px;border-bottom:1px solid #eeeeee;">
          <strong style="font-size:12px;color:#888;display:block;">Subject</strong>
          <span style="font-size:14px;color:#333;">${esc(subject || 'Enquiry')}</span>
        </td></tr>
        <tr><td style="padding:16px;">
          <strong style="font-size:12px;color:#888;display:block;margin-bottom:8px;">Message</strong>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#444;white-space:pre-wrap;">${safeMessage}</p>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#888;">Reply directly to this email to respond to the customer.</p>`,
    vars: {},
  });
};

// ─── 23. Newsletter Subscription ─────────────────────────────────────────────
const sendNewsletterSubscribeEmail = async ({ to }) => {
  const branding = await getEmailBranding();
  return _buildAndSend({
    to, subject: 'Thank you for subscribing to StructBay!',
    title: 'You\'re Subscribed! 🎉',
    greeting: 'Hi there,',
    bodyHtml: `
      <p>Thank you for subscribing to the <strong>StructBay Newsletter</strong>!</p>
      <p>You'll now be among the first to receive:</p>
      <ul style="padding-left:20px;line-height:2;font-size:14px;color:#555;">
        <li> 1.Exclusive offers and discounts</li>
        <li> 2.New product announcements</li>
        <li> 3.Construction industry insights</li>
        <li> 4.StructBay platform updates</li>
      </ul>
      <p>Stay tuned for exciting content coming your way!</p>`,
    cta: { label: 'Explore StructBay', url: branding.siteUrl },
    vars: {},
  });
};

// --- EXTENDED CUSTOMER EMAILS ---
const sendRefundInitiatedEmail = async ({ to, name, orderNumber, amount, reason }) => {
  return _buildAndSend({
    to, subject: `Refund Initiated for Order #${orderNumber}`,
    title: 'Refund Initiated',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>We have initiated a refund of <strong>₹${amount}</strong> for your order <strong>#${orderNumber}</strong>.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      <p>It may take 5-7 business days for the amount to reflect in your original payment method.</p>`,
    vars: { name, orderNumber, amount, reason },
  });
};

const sendRefundCompletedEmail = async ({ to, name, orderNumber, amount, transactionId }) => {
  return _buildAndSend({
    to, subject: `Refund Completed for Order #${orderNumber}`,
    title: 'Refund Completed 🎉',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your refund of <strong>₹${amount}</strong> for order <strong>#${orderNumber}</strong> has been successfully processed.</p>
      ${transactionId ? `<p>Transaction ID: <strong>${transactionId}</strong></p>` : ''}
      <p>If you don't see the credit in your account, please contact your bank.</p>`,
    vars: { name, orderNumber, amount, transactionId },
  });
};

const sendPaymentPendingEmail = async ({ to, name, orderNumber, amount, paymentLink }) => {
  return _buildAndSend({
    to, subject: `Action Required: Complete Payment for Order #${orderNumber}`,
    title: 'Payment Pending ⚠️',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your order <strong>#${orderNumber}</strong> is currently pending payment.</p>
      <p>Amount Due: <strong>₹${amount}</strong></p>
      <p>Please complete your payment to proceed with the order processing.</p>`,
    cta: paymentLink ? { label: 'Pay Now', url: paymentLink } : null,
    vars: { name, orderNumber, amount },
  });
};

const sendInvoiceGeneratedEmail = async ({ to, name, orderNumber, invoiceNumber, invoiceLink }) => {
  return _buildAndSend({
    to, subject: `Invoice ${invoiceNumber} for Order #${orderNumber}`,
    title: 'Invoice Generated 📄',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your invoice <strong>${invoiceNumber}</strong> for order <strong>#${orderNumber}</strong> has been generated.</p>
      <p>You can download or view it using the link below.</p>`,
    cta: invoiceLink ? { label: 'View Invoice', url: invoiceLink } : null,
    vars: { name, orderNumber, invoiceNumber },
  });
};

const sendQuoteExpiredEmail = async ({ to, name, quoteNumber, rfqNumber }) => {
  return _buildAndSend({
    to, subject: `Quotation ${quoteNumber} has Expired`,
    title: 'Quotation Expired ⏰',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>The quotation <strong>${quoteNumber}</strong> provided for your RFQ <strong>${rfqNumber}</strong> has expired.</p>
      <p>If you still wish to proceed, please request a new quotation.</p>`,
    vars: { name, quoteNumber, rfqNumber },
  });
};

const sendOrderPackedEmail = async ({ to, name, orderNumber }) => {
  return _buildAndSend({
    to, subject: `Your Order #${orderNumber} is Packed and Ready to Ship`,
    title: 'Order Packed 📦',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Great news! Your order <strong>#${orderNumber}</strong> has been packed and is awaiting pickup from our courier partner.</p>
      <p>We will notify you once it's dispatched.</p>`,
    vars: { name, orderNumber },
  });
};

const sendContactUsConfirmationEmail = async ({ to, name }) => {
  return _buildAndSend({
    to, subject: `We've Received Your Message, ${name}!`,
    title: 'Thank You for Contacting Us 💬',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>This is a confirmation that we have received your message.</p>
      <p>Our team will review your inquiry and get back to you as soon as possible, usually within 24-48 business hours.</p>
      <p>We appreciate you reaching out to us!</p>`,
    vars: { name },
  });
};

const sendLoginAlertEmail = async ({ to, name }) => {
  return _buildAndSend({
    to, subject: 'New Login to your StructBay Account',
    title: 'New Login Detected 🔐',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>We detected a new login to your StructBay account.</p>
      <p>If this was you, you can safely ignore this email. If you did not log in, please reset your password immediately.</p>`,
    vars: { name },
  });
};

const sendAccountLockedEmail = async ({ to, name, reason }) => {
  return _buildAndSend({
    to, subject: 'Action Required: Your StructBay Account is Locked',
    title: 'Account Locked 🔒',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your StructBay account has been temporarily locked.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please contact our support team to resolve this issue and restore your access.</p>`,
    vars: { name },
  });
};

const sendAccountReactivatedEmail = async ({ to, name }) => {
  return _buildAndSend({
    to, subject: 'Your StructBay Account has been Reactivated',
    title: 'Account Reactivated ✅',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Good news! Your StructBay account has been reactivated and is now ready to use.</p>
      <p>You can now log in and access all features as usual.</p>`,
    vars: { name },
  });
};

const sendEmailAlreadyVerifiedEmail = async ({ to, name }) => {
  return _buildAndSend({
    to, subject: 'Your StructBay Email is Already Verified',
    title: 'Email Already Verified',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>We noticed you tried to verify your email, but your email address is already verified.</p>
      <p>You can continue to use your account without any further verification steps.</p>`,
    vars: { name },
  });
};

const sendProfileUpdatedEmail = async ({ to, name, role }) => {
  return _buildAndSend({
    to, subject: 'Your StructBay Profile was Updated',
    title: 'Profile Updated 👤',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your ${role ? role + ' ' : ''}profile information was successfully updated.</p>
      <p>If you did not make this change, please contact our support team immediately.</p>`,
    vars: { name },
  });
};

const sendEmailChangedEmail = async ({ to, name, newEmail }) => {
  return _buildAndSend({
    to, subject: 'Your StructBay Email Address has Changed',
    title: 'Email Address Changed',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your account email address has been changed to <strong>${newEmail}</strong>.</p>
      <p>If you did not authorize this change, please contact us immediately to secure your account.</p>`,
    vars: { name },
  });
};

const sendPhoneChangedEmail = async ({ to, name, newPhone }) => {
  return _buildAndSend({
    to, subject: 'Your StructBay Phone Number has Changed',
    title: 'Phone Number Changed',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your account phone number has been updated to <strong>${newPhone}</strong>.</p>
      <p>If you did not make this change, please let us know immediately.</p>`,
    vars: { name },
  });
};

const sendAddressAddedEmail = async ({ to, name, addressType }) => {
  return _buildAndSend({
    to, subject: 'New Address Added to your StructBay Account',
    title: 'New Address Added 📍',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>A new ${addressType || 'delivery'} address has been added to your profile.</p>
      <p>You can manage all your addresses from your account dashboard.</p>`,
    vars: { name },
  });
};

const sendAddressUpdatedEmail = async ({ to, name, addressType }) => {
  return _buildAndSend({
    to, subject: 'Address Updated in your StructBay Account',
    title: 'Address Updated 📍',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your ${addressType || 'delivery'} address has been successfully updated.</p>
      <p>You can manage all your addresses from your account dashboard.</p>`,
    vars: { name },
  });
};

const sendGSTVerificationEmail = async ({ to, name, status, reason }) => {
  return _buildAndSend({
    to, subject: `GST Verification ${status} - StructBay`,
    title: `GST Verification ${status}`,
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your GST verification is now <strong>${status}</strong>.</p>
      ${reason ? `<p><strong>Details:</strong> ${reason}</p>` : ''}
      <p>If you have any questions, please contact our support team.</p>`,
    vars: { name },
  });
};

const sendKYCVerificationEmail = async ({ to, name, status, reason }) => {
  return _buildAndSend({
    to, subject: `KYC Verification ${status} - StructBay`,
    title: `KYC Verification ${status}`,
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your KYC verification is now <strong>${status}</strong>.</p>
      ${reason ? `<p><strong>Details:</strong> ${reason}</p>` : ''}
      <p>If you have any questions, please contact our support team.</p>`,
    vars: { name },
  });
};

// --- VENDOR & PRODUCT EMAILS ---
const sendVendorPendingApprovalEmail = async ({ to, name, companyName }) => {
  return _buildAndSend({
    to, subject: 'Your Vendor Application is Pending Approval',
    title: 'Vendor Application Pending ⏳',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Thank you for submitting your vendor application for <strong>${companyName}</strong>.</p>
      <p>Our team is currently reviewing your details. This process usually takes 2-3 business days.</p>
      <p>We will notify you once your application has been processed.</p>`,
    vars: { name },
  });
};

const sendVendorDocumentsExpiringEmail = async ({ to, name, documents }) => {
  return _buildAndSend({
    to, subject: 'Action Required: Your Vendor Documents are Expiring Soon',
    title: 'Documents Expiring ⚠️',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>This is a friendly reminder that some of your vendor documents are expiring soon:</p>
      <ul>
        ${documents.map(d => `<li><strong>${d.name}</strong> - Expires on: ${d.expiryDate}</li>`).join('')}
      </ul>
      <p>Please log in to your vendor dashboard and update these documents to avoid any interruptions in your service.</p>`,
    vars: { name },
  });
};

const sendProductSubmittedEmail = async ({ to, name, productName }) => {
  return _buildAndSend({
    to, subject: `Product Submitted for Review: ${productName}`,
    title: 'Product Submitted 🛒',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your product <strong>${productName}</strong> has been successfully submitted and is currently under review by our catalog team.</p>
      <p>You will be notified once the product is approved and live on the marketplace.</p>`,
    vars: { name },
  });
};

const sendProductApprovedEmail = async ({ to, name, productName, productUrl }) => {
  return _buildAndSend({
    to, subject: `Your Product is Live: ${productName}`,
    title: 'Product Approved ✅',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Great news! Your product <strong>${productName}</strong> has been approved and is now live on StructBay.</p>
      <p>Customers can now view and purchase your product.</p>`,
    cta: productUrl ? { label: 'View Product', url: productUrl } : null,
    vars: { name },
  });
};

const sendProductRejectedEmail = async ({ to, name, productName, reason }) => {
  return _buildAndSend({
    to, subject: `Product Review Update: ${productName}`,
    title: 'Product Rejected ❌',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your product submission for <strong>${productName}</strong> could not be approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please review the feedback and update your product details from your vendor dashboard.</p>`,
    vars: { name },
  });
};

const sendProductBackInStockEmail = async ({ to, name, productName, productUrl }) => {
  return _buildAndSend({
    to, subject: `Back in Stock: ${productName}`,
    title: 'Back In Stock! 🎉',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Good news! The product you've been waiting for is now back in stock:</p>
      <p><strong>${productName}</strong></p>
      <p>Hurry up and grab it before it runs out again!</p>`,
    cta: productUrl ? { label: 'Shop Now', url: productUrl } : null,
    vars: { name },
  });
};

const sendPriceDropEmail = async ({ to, name, productName, oldPrice, newPrice, productUrl }) => {
  return _buildAndSend({
    to, subject: `Price Drop Alert: ${productName}`,
    title: 'Price Drop Alert 📉',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>The price for a product you have your eye on has just dropped!</p>
      <p><strong>${productName}</strong></p>
      <p>Old Price: <strike>₹${oldPrice}</strike><br/>
      <strong>New Price: ₹${newPrice}</strong></p>`,
    cta: productUrl ? { label: 'Shop Now', url: productUrl } : null,
    vars: { name },
  });
};

const sendInventoryLowEmail = async ({ to, name, productName, remainingQuantity }) => {
  return _buildAndSend({
    to, subject: `Low Inventory Alert: ${productName}`,
    title: 'Inventory Low ⚠️',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>This is an automated alert that your inventory for the following product is running low:</p>
      <p><strong>${productName}</strong></p>
      <p>Remaining Quantity: <strong>${remainingQuantity}</strong></p>
      <p>Please restock soon to avoid missing out on potential sales.</p>`,
    vars: { name },
  });
};

// --- OTHER EMAILS ---
const sendOrderShippedEmail = async ({ to, name, orderNumber, trackingUrl, courierName }) => {
  return _buildAndSend({
    to, subject: `Your Order #${orderNumber} has been Shipped!`,
    title: 'Order Shipped 🚚',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your order <strong>#${orderNumber}</strong> has been shipped via ${courierName || 'our courier partner'}.</p>
      <p>It is now on its way to your delivery address.</p>`,
    cta: trackingUrl ? { label: 'Track Shipment', url: trackingUrl } : null,
    vars: { name, orderNumber },
  });
};

const sendRFQAdminNotificationEmail = async ({ to, rfqNumber, customerName }) => {
  return _buildAndSend({
    to, subject: `New RFQ Submitted: ${rfqNumber}`,
    title: 'New RFQ Received 📄',
    greeting: `Hello Admin,`,
    bodyHtml: `
      <p>A new Request for Quotation (<strong>${rfqNumber}</strong>) has been submitted by <strong>${customerName}</strong>.</p>
      <p>Please review and assign a vendor or provide a quotation.</p>`,
    vars: { rfqNumber, customerName },
  });
};

const sendRFQVendorAssignmentEmail = async ({ to, vendorName, rfqNumber, productDetails }) => {
  return _buildAndSend({
    to, subject: `New RFQ Assigned to You: ${rfqNumber}`,
    title: 'RFQ Assigned 📝',
    greeting: `Hi ${vendorName},`,
    bodyHtml: `
      <p>You have been assigned a new Request for Quotation (<strong>${rfqNumber}</strong>).</p>
      <p><strong>Product Details:</strong> ${productDetails}</p>
      <p>Please review the requirements and submit your best quotation.</p>`,
    vars: { vendorName, rfqNumber },
  });
};

const sendRFQVendorQuoteSubmittedEmail = async ({ to, adminName, vendorName, rfqNumber }) => {
  return _buildAndSend({
    to, subject: `Vendor Quote Submitted for RFQ: ${rfqNumber}`,
    title: 'Vendor Quote Received 📥',
    greeting: `Hi ${adminName},`,
    bodyHtml: `
      <p>Vendor <strong>${vendorName}</strong> has submitted a quotation for RFQ <strong>${rfqNumber}</strong>.</p>
      <p>Please review the quote and forward it to the customer for approval.</p>`,
    vars: { adminName, vendorName, rfqNumber },
  });
};

const sendRFQQuoteAcceptedEmail = async ({ to, vendorName, rfqNumber }) => {
  return _buildAndSend({
    to, subject: `Your Quote for RFQ ${rfqNumber} was Accepted!`,
    title: 'Quote Accepted 🎉',
    greeting: `Hi ${vendorName},`,
    bodyHtml: `
      <p>Great news! The customer has accepted your quotation for RFQ <strong>${rfqNumber}</strong>.</p>
      <p>An official order will be generated shortly.</p>`,
    vars: { vendorName, rfqNumber },
  });
};

const sendBulkEnquiryAdminNotificationEmail = async ({ to, enquiryId, customerName, details }) => {
  return _buildAndSend({
    to, subject: `New Bulk Enquiry Received: ${enquiryId}`,
    title: 'New Bulk Enquiry 🏢',
    greeting: `Hello Admin,`,
    bodyHtml: `
      <p>A new bulk enquiry (<strong>${enquiryId}</strong>) has been submitted by <strong>${customerName}</strong>.</p>
      <p><strong>Details:</strong> ${details}</p>
      <p>Please assign this to the sales team for follow-up.</p>`,
    vars: { enquiryId, customerName },
  });
};

const sendBulkEnquirySalesNotificationEmail = async ({ to, salesRepName, enquiryId, customerName }) => {
  return _buildAndSend({
    to, subject: `Action Required: Follow up on Bulk Enquiry ${enquiryId}`,
    title: 'Bulk Enquiry Assigned 📞',
    greeting: `Hi ${salesRepName},`,
    bodyHtml: `
      <p>You have been assigned a new bulk enquiry (<strong>${enquiryId}</strong>) from <strong>${customerName}</strong>.</p>
      <p>Please follow up with the customer within the next 4 business hours.</p>`,
    vars: { salesRepName, enquiryId, customerName },
  });
};

const sendBulkEnquiryFollowUpReminderEmail = async ({ to, salesRepName, enquiryId }) => {
  return _buildAndSend({
    to, subject: `Reminder: Pending Follow-up for Bulk Enquiry ${enquiryId}`,
    title: 'Follow-Up Reminder ⏰',
    greeting: `Hi ${salesRepName},`,
    bodyHtml: `
      <p>This is a reminder to follow up on bulk enquiry <strong>${enquiryId}</strong>.</p>
      <p>If you have already contacted the customer, please update the status in the CRM.</p>`,
    vars: { salesRepName, enquiryId },
  });
};

const sendNewsletterAdminNotificationEmail = async ({ to, subscriberEmail }) => {
  return _buildAndSend({
    to, subject: `New Newsletter Subscriber: ${subscriberEmail}`,
    title: 'New Subscriber 📬',
    greeting: `Hello Admin,`,
    bodyHtml: `
      <p>You have a new newsletter subscriber: <strong>${subscriberEmail}</strong>.</p>`,
    vars: { subscriberEmail },
  });
};

const sendWelcomeNewsletterEmail = async ({ to, name }) => {
  return _buildAndSend({
    to, subject: 'Welcome to the StructBay Newsletter!',
    title: 'Welcome! 🗞️',
    greeting: `Hi ${name || 'there'},`,
    bodyHtml: `
      <p>Thank you for confirming your subscription to the StructBay Newsletter.</p>
      <p>You can look forward to industry insights, exclusive deals, and platform updates delivered right to your inbox.</p>`,
    vars: { name },
  });
};

const sendNewsletterUnsubscribeEmail = async ({ to, name }) => {
  return _buildAndSend({
    to, subject: 'You have been unsubscribed from StructBay Newsletter',
    title: 'Unsubscribed successfully',
    greeting: `Hi ${name || 'there'},`,
    bodyHtml: `
      <p>You have been successfully unsubscribed from our newsletter.</p>
      <p>We are sorry to see you go! If you ever change your mind, you can resubscribe at any time from our website.</p>`,
    vars: { name },
  });
};

const sendNewsletterResubscribeEmail = async ({ to, name }) => {
  return _buildAndSend({
    to, subject: 'Welcome back to the StructBay Newsletter!',
    title: 'Resubscribed! 🎉',
    greeting: `Hi ${name || 'there'},`,
    bodyHtml: `
      <p>Welcome back! We are thrilled to have you back on our newsletter list.</p>
      <p>Get ready for more exciting updates and offers.</p>`,
    vars: { name },
  });
};

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sendEmail,
  _buildAndSend,
  // Auth
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendAccountLockedEmail,
  sendAccountReactivatedEmail,
  sendEmailAlreadyVerifiedEmail,
  // Orders
  sendOrderPlacedEmail,
  sendOrderConfirmedEmail,
  sendOrderProcessingEmail,
  sendOutForDeliveryEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendOrderShippedEmail,
  sendOrderPackedEmail,
  sendPaymentPendingEmail,
  sendRefundInitiatedEmail,
  sendRefundCompletedEmail,
  sendInvoiceGeneratedEmail,
  // Payments
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  // RFQ & Enquiries
  sendRFQSubmittedEmail,
  sendRFQApprovedEmail,
  sendRFQRejectedEmail,
  sendBulkEnquiryEmail,
  sendRFQAdminNotificationEmail,
  sendRFQVendorAssignmentEmail,
  sendRFQVendorQuoteSubmittedEmail,
  sendRFQQuoteAcceptedEmail,
  sendQuoteExpiredEmail,
  sendBulkEnquiryAdminNotificationEmail,
  sendBulkEnquirySalesNotificationEmail,
  sendBulkEnquiryFollowUpReminderEmail,
  // Projects
  sendProjectCreatedEmail,
  sendProjectUpdatedEmail,
  // Vendors
  sendVendorApplicationEmail,
  sendVendorApprovedEmail,
  sendVendorRejectedEmail,
  sendVendorPendingApprovalEmail,
  sendVendorDocumentsExpiringEmail,
  // Profile
  sendProfileUpdatedEmail,
  sendEmailChangedEmail,
  sendPhoneChangedEmail,
  sendAddressAddedEmail,
  sendAddressUpdatedEmail,
  sendGSTVerificationEmail,
  sendKYCVerificationEmail,
  // Products
  sendProductSubmittedEmail,
  sendProductApprovedEmail,
  sendProductRejectedEmail,
  sendProductBackInStockEmail,
  sendPriceDropEmail,
  sendInventoryLowEmail,
  // Others
  sendContactFormEmail,
  sendNewsletterSubscribeEmail,
  sendContactUsConfirmationEmail,
  sendNewsletterAdminNotificationEmail,
  sendWelcomeNewsletterEmail,
  sendNewsletterUnsubscribeEmail,
  sendNewsletterResubscribeEmail,
};
