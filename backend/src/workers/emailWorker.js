const EmailQueue = require('../models/EmailQueue');
const logger = require('../config/logger');
const { Resend } = require('resend');

const trim = (v) => (typeof v === 'string' ? v.trim() : v || '');

const getResendClient = () => {
  const apiKey = trim(process.env.RESEND_API_KEY);
  if (!apiKey || apiKey === 're_123456789') return null; // Fallback to nodemailer if dummy key
  return new Resend(apiKey);
};

const getFallbackTransporter = () => {
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: trim(process.env.GMAIL_USER) || trim(process.env.EMAIL_FROM),
      pass: trim(process.env.GMAIL_PASS),
    },
  });
};

const defaultFrom = () => {
  return trim(process.env.EMAIL_FROM) || 'hello@structbay.com';
};

let isProcessing = false;

const processEmailQueue = async () => {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    const jobs = await EmailQueue.find({
      status: { $in: ['PENDING', 'FAILED'] },
      nextAttemptAt: { $lte: new Date() },
      attempts: { $lt: 3 }
    }).sort({ priority: -1, nextAttemptAt: 1 }).limit(10);
    
    if (!jobs.length) {
      isProcessing = false;
      return;
    }

    const resend = getResendClient();
    if (!resend && !trim(process.env.GMAIL_PASS)) {
      logger.warn('Email Queue blocked: Neither RESEND_API_KEY nor GMAIL_PASS is configured.');
      isProcessing = false;
      return;
    }
    
    const fromAddr = defaultFrom();

    for (const job of jobs) {
      job.status = 'PROCESSING';
      await job.save();
      
      try {
        const mailOptions = {
          from: `Structbay <${fromAddr}>`,
          to: job.to,
          subject: job.subject,
          html: job.html,
        };
        if (job.text) mailOptions.text = job.text;
        if (job.replyTo) mailOptions.reply_to = job.replyTo;
        
        let providerId = 'nodemailer-' + Date.now();
        if (resend) {
          const response = await resend.emails.send(mailOptions);
          if (response.error) throw new Error(response.error.message || 'Resend API returned an error');
          providerId = response.data.id;
        } else {
          // Fallback to Nodemailer
          const transporter = getFallbackTransporter();
          const info = await transporter.sendMail(mailOptions);
          providerId = info.messageId;
        }

        job.status = 'COMPLETED';
        job.providerId = providerId;
        await job.save();
        logger.info(`Email sent successfully to ${job.to}. ID: ${providerId}`);
      } catch (err) {
        job.attempts += 1;
        job.errorLogs.push(err.message || 'Unknown error');
        if (job.attempts >= job.maxAttempts) {
          job.status = 'FAILED';
        } else {
          job.status = 'PENDING';
          // Exponential backoff
          job.nextAttemptAt = new Date(Date.now() + Math.pow(2, job.attempts) * 60000); 
        }
        await job.save();
        logger.error(`Failed to send email to ${job.to} via Resend: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error('Error processing email queue: ' + error.message);
  } finally {
    isProcessing = false;
  }
};

const startEmailWorker = () => {
  // Check every 30 seconds
  setInterval(processEmailQueue, 30000);
  logger.info('Email worker started (checks every 30s) - Powered by Resend');
  // Initial check
  processEmailQueue();
};

module.exports = { startEmailWorker, processEmailQueue };
