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
  const host    = trim(process.env.SMTP_HOST);
  const smtpUser = trim(process.env.SMTP_USER);
  const smtpPass = trim(process.env.SMTP_PASS);
  const gmailUser = trim(process.env.GMAIL_USER);
  const gmailPass = trim(process.env.GMAIL_PASS);
  const authUser = smtpUser || gmailUser;
  const authPass = smtpPass || gmailPass;

  if (host && authUser && authPass) {
    const port   = parseInt(String(trim(process.env.SMTP_PORT) || '587'), 10) || 587;
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
  let defaultLogo = 'http://localhost:3000/banner/Structbay%20logo.png';
  try {
    const logoPath = 'c:\\Users\\HP\\Desktop\\RITI RAI\\HSDA\\STRUCTBAY\\frontend\\dist\\banner\\Structbay logo.png';
    if (fs.existsSync(logoPath)) {
      defaultLogo = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }
  } catch (e) {}

  const exactDesc = "StructBay combines the reliability of branded materials, the power of affordable pricing, and the ease of single-window sourcing — everything you need to finish projects faster and better.";

  try {
    const CMS = require('../models/CMS');
    const cms = await CMS.getOrCreate();
    const footer = cms.footer || {};
    const base = trim(process.env.FRONTEND_URL) || 'http://localhost:3000';
    return {
      siteUrl:       base.replace(/\/$/, ''),
      companyName:   'StructBay',
      logoUrl:       trim(cms.brandLogoUrl) || defaultLogo,
      address:       trim(footer.address)   || 'Vidyaranyapura, Bengaluru',
      phone:         trim(footer.phone)     || '+91 70905 70505',
      email:         trim(footer.email)     || 'hello@structbay.com',
      copyright:     trim(footer.copyrightText) || `© ${new Date().getFullYear()} StructBay. All Rights Reserved.`,
      description:   trim(footer.companyDescription) || exactDesc,
      social: {
        facebook:  trim(footer.socialLinks?.facebook),
        instagram: trim(footer.socialLinks?.instagram),
        twitter:   trim(footer.socialLinks?.twitter),
        linkedin:  trim(footer.socialLinks?.linkedin),
        youtube:   trim(footer.socialLinks?.youtube),
      },
    };
  } catch (err) {
    logger.warn(`Email branding load failed (using defaults): ${err.message}`);
    const base = trim(process.env.FRONTEND_URL) || 'http://localhost:3000';
    return {
      siteUrl:     base.replace(/\/$/, ''),
      companyName: 'StructBay',
      logoUrl:     defaultLogo,
      address:     'Vidyaranyapura, Bengaluru',
      phone:       '+91 70905 70505',
      email:       'hello@structbay.com',
      copyright:   `© ${new Date().getFullYear()} StructBay. All Rights Reserved.`,
      description: exactDesc,
      social:      {},
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

  const logoBlock = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="${esc(companyName)}" style="max-height:48px;max-width:180px;display:block;" />`
    : `<span style="font-size:26px;font-weight:900;color:#E85A00;letter-spacing:-1px;font-family:Arial,sans-serif;">Struct<span style="color:#ffffff;">Bay</span></span>`;

  const ctaBlock = cta
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:28px auto 8px;"><tr><td align="center" style="border-radius:6px;background-color:#E85A00;">
        <a href="${esc(cta.url)}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;letter-spacing:0.3px;">${esc(cta.label)}</a>
       </td></tr></table>` : '';

  const socialIcons = [];
  if (social.facebook && social.facebook !== '#') socialIcons.push(`<a href="${esc(social.facebook)}" style="margin:0 6px;display:inline-block;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="20" height="20" alt="Facebook" style="border:0;display:block;" /></a>`);
  if (social.instagram && social.instagram !== '#') socialIcons.push(`<a href="${esc(social.instagram)}" style="margin:0 6px;display:inline-block;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="20" height="20" alt="Instagram" style="border:0;display:block;" /></a>`);
  if (social.linkedin && social.linkedin !== '#') socialIcons.push(`<a href="${esc(social.linkedin)}" style="margin:0 6px;display:inline-block;"><img src="https://cdn-icons-png.flaticon.com/32/733/733561.png" width="20" height="20" alt="LinkedIn" style="border:0;display:block;" /></a>`);
  if (social.twitter && social.twitter !== '#') socialIcons.push(`<a href="${esc(social.twitter)}" style="margin:0 6px;display:inline-block;"><img src="https://cdn-icons-png.flaticon.com/32/5968/5968830.png" width="20" height="20" alt="Twitter" style="border:0;display:block;" /></a>`);
  if (social.youtube && social.youtube !== '#') socialIcons.push(`<a href="${esc(social.youtube)}" style="margin:0 6px;display:inline-block;"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="20" height="20" alt="YouTube" style="border:0;display:block;" /></a>`);

  const contactLine = [
    phone ? `📞 ${esc(phone)}` : null,
    email ? `✉️ <a href="mailto:${esc(email)}" style="color:#E85A00;text-decoration:none;">${esc(email)}</a>` : null,
    address ? `📍 ${esc(address)}` : null,
  ].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <title>${esc(title)}</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
    body{margin:0;padding:0;background-color:#f2f4f8}
    @media only screen and (max-width:620px){
      .email-container{width:100%!important;margin:auto!important}
      .content-cell{padding:28px 20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f2f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f2f4f8;">
    <tr><td align="center" style="padding:32px 16px;">

      <!-- Email Container -->
      <table class="email-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">

        <!-- Header -->
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:32px 40px;">
            <a href="${esc(siteUrl)}" target="_blank" style="text-decoration:none;">
              ${logoBlock}
            </a>
          </td>
        </tr>

        <!-- Orange accent bar -->
        <tr><td height="4" style="background-color:#E85A00;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Email Title -->
        <tr>
          <td align="center" style="background-color:#E85A00;padding:16px 40px;">
            <h1 style="margin:0;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${esc(title)}</h1>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td class="content-cell" style="padding:36px 44px 20px;">
            ${greeting ? `<p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:16px;color:#333333;font-weight:600;">${esc(greeting)}</p>` : ''}
            <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#444444;">
              ${bodyHtml}
            </div>
            ${ctaBlock}
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 44px;"><hr style="border:0;border-top:1px solid #f0f0f0;margin:4px 0 0;" /></td></tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a2e;padding:28px 40px 20px;" align="center">
            <!-- Logo in footer -->
            <div style="margin-bottom:14px;">
              <a href="${esc(siteUrl)}" target="_blank" style="text-decoration:none;">
                ${logoUrl
                  ? `<img src="${esc(logoUrl)}" alt="${esc(companyName)}" style="max-height:36px;max-width:140px;display:block;margin:0 auto;" />`
                  : `<span style="font-size:20px;font-weight:900;color:#E85A00;font-family:Arial,sans-serif;letter-spacing:-1px;">Struct<span style="color:#ffffff;">Bay</span></span>`}
              </a>
            </div>
            <!-- Description -->
            <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6;max-width:420px;text-align:center;">${esc(description)}</p>
            <!-- Social Icons -->
            ${socialIcons.length ? `<div style="margin:12px 0 14px;">${socialIcons.join('')}</div>` : ''}
            <!-- Contact -->
            ${contactLine ? `<p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.45);line-height:1.8;">${contactLine}</p>` : ''}
            <!-- Website -->
            <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:11px;">
              <a href="${esc(siteUrl)}" style="color:#E85A00;text-decoration:none;">${esc(siteUrl)}</a>
            </p>
            <!-- Divider -->
            <hr style="border:0;border-top:1px solid rgba(255,255,255,0.1);margin:10px 0 14px;" />
            <!-- Copyright -->
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.35);line-height:1.5;">${esc(copyright)}</p>
          </td>
        </tr>

      </table>
      <!-- End Container -->

      <!-- Anti-spam note -->
      <p style="margin:16px auto 0;max-width:600px;font-family:Arial,sans-serif;font-size:11px;color:#999999;text-align:center;line-height:1.5;">
        You received this email because of your activity on ${esc(companyName)}.
        If you did not expect this, you can safely ignore it.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── Core Sender ─────────────────────────────────────────────────────────────

/**
 * Base email sender — uses configured SMTP, never hardcodes addresses.
 */
const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(`Email skipped (not configured): would send to ${to} — ${subject}`);
    return null;
  }
  try {
    const fromAddr = defaultFrom();
    if (!fromAddr) {
      logger.warn(`Email skipped (SMTP_FROM not set): would send to ${to} — ${subject}`);
      return null;
    }
    const mail = {
      from: `"StructBay" <${fromAddr}>`,
      to,
      subject,
      html,
    };
    if (text)    mail.text    = text;
    if (replyTo) mail.replyTo = replyTo;
    else         mail.replyTo = fromAddr;

    const info = await transporter.sendMail(mail);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    const extra = err.responseCode ? ` SMTP ${err.responseCode}` : '';
    logger.error(`Email send failed to ${to}: ${err.message}${extra}`);
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
  const resolvedTitle    = interpolate(title, vars);
  const resolvedSubject  = interpolate(subject, vars);
  const resolvedCta      = cta ? { label: interpolate(cta.label, vars), url: interpolate(cta.url, vars) } : null;

  const html = masterTemplate({
    title:    resolvedTitle,
    greeting: resolvedGreeting,
    bodyHtml: resolvedBodyHtml,
    cta:      resolvedCta,
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
  const url  = `${base}/verify-email?token=${encodeURIComponent(token)}`;
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
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #f0f0f0;border-radius:6px;overflow:hidden;">
        <tr style="background:#f8f8f8;">
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#666;font-weight:600;border-bottom:1px solid #eeeeee;">Product</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;color:#666;font-weight:600;border-bottom:1px solid #eeeeee;">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-size:12px;color:#666;font-weight:600;border-bottom:1px solid #eeeeee;">Price</th>
        </tr>
        ${items.map(i => `
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#333;border-bottom:1px solid #f5f5f5;">${esc(i.name)}</td>
          <td style="padding:10px 14px;font-size:13px;color:#555;text-align:center;border-bottom:1px solid #f5f5f5;">${esc(String(i.quantity))}</td>
          <td style="padding:10px 14px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #f5f5f5;">₹${Number(i.price || 0).toLocaleString('en-IN')}</td>
        </tr>`).join('')}
        <tr style="background:#f8f8f8;">
          <td colspan="2" style="padding:12px 14px;font-size:13px;color:#555;">Subtotal</td>
          <td style="padding:12px 14px;font-size:13px;color:#333;text-align:right;">₹${Number(subtotal || 0).toLocaleString('en-IN')}</td>
        </tr>
        <tr style="background:#f8f8f8;">
          <td colspan="2" style="padding:12px 14px;font-size:13px;color:#555;border-bottom:1px solid #eeeeee;">GST</td>
          <td style="padding:12px 14px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #eeeeee;">₹${Number(gstTotal || 0).toLocaleString('en-IN')}</td>
        </tr>
        <tr style="background:#f8f8f8;">
          <td colspan="2" style="padding:12px 14px;font-size:14px;font-weight:700;color:#333;">Grand Total</td>
          <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#E85A00;text-align:right;">₹${Number(amount || 0).toLocaleString('en-IN')}</td>
        </tr>
      </table>`
    : `<p style="background:#f8f8f8;padding:14px;border-radius:6px;font-size:14px;color:#555;">
        Order Total: <strong style="color:#E85A00;">₹${Number(amount || 0).toLocaleString('en-IN')}</strong>
       </p>`;

  return _buildAndSend({
    to, subject: `Order Placed — ${orderNumber}`,
    title: 'Order Placed Successfully! 🛒',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Your order has been placed successfully on StructBay. Here are your order details:</p>
      <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#666;">Order Number: <strong style="color:#333;font-size:15px;">${esc(orderNumber)}</strong></p>
      </div>
      ${itemsHtml}
      <p>Our team is reviewing your order and a vendor will be assigned shortly. You'll receive a confirmation email once it's confirmed.</p>`,
    cta: { label: 'Track Order', url: `${branding.siteUrl}/orders/${orderNumber}` },
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
      <p>Thank you for choosing StructBay! 🙏</p>`,
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
    to, subject: 'Vendor Application Received – StructBay',
    title: 'Vendor Application Received',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p>Thank you for applying to become a vendor on StructBay!</p>
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
    to, subject: '🎉 Vendor Account Approved – StructBay',
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
    to, subject: 'Vendor Application Update – StructBay',
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
        <li>🎁 Exclusive offers and discounts</li>
        <li>📦 New product announcements</li>
        <li>💡 Construction industry insights</li>
        <li>🚀 StructBay platform updates</li>
      </ul>
      <p>Stay tuned for exciting content coming your way!</p>`,
    cta: { label: 'Explore StructBay', url: branding.siteUrl },
    vars: {},
  });
};

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sendEmail,
  // Auth
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWelcomeEmail,
  // Orders
  sendOrderPlacedEmail,
  sendOrderConfirmedEmail,
  sendOrderProcessingEmail,
  sendOutForDeliveryEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  // Payments
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  // RFQ & Enquiries
  sendRFQSubmittedEmail,
  sendRFQApprovedEmail,
  sendRFQRejectedEmail,
  sendBulkEnquiryEmail,
  // Projects
  sendProjectCreatedEmail,
  sendProjectUpdatedEmail,
  // Vendors
  sendVendorApplicationEmail,
  sendVendorApprovedEmail,
  sendVendorRejectedEmail,
  // Others
  sendContactFormEmail,
  sendNewsletterSubscribeEmail,
};
