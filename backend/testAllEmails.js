require('dotenv').config();
const nodemailer = require('nodemailer');
const emailService = require('./src/services/email.service');
const EmailQueue = require('./src/models/EmailQueue');

const toEmail = 'ritirai0612@gmail.com';

// Setup Nodemailer using Gmail App Password from .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || toEmail,
    pass: process.env.GMAIL_PASS, // MUST BE SET IN .ENV!
  },
});

// Mock EmailQueue.create to bypass MongoDB and send directly via Nodemailer
EmailQueue.create = async (job) => {
  const mailOptions = {
    from: `Structbay <${process.env.GMAIL_USER || toEmail}>`,
    to: job.to,
    subject: job.subject,
    html: job.html,
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Sent: ${job.subject} (ID: ${info.messageId})`);
  } catch (err) {
    console.error(`❌ Error sending: ${job.subject} -`, err.message);
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log(`Starting to send Core test emails to ${toEmail} using Gmail...`);
  
  const commonArgs = {
    to: toEmail,
    name: 'Riti Rai',
  };

  const tasks = [
    // Core Auth & Profile
    () => emailService.sendWelcomeEmail(commonArgs),
    () => emailService.sendPasswordResetEmail({ ...commonArgs, resetToken: 'test-token' }),
    () => emailService.sendLoginAlertEmail(commonArgs),
    
    // Core Orders
    () => emailService.sendOrderPlacedEmail({ ...commonArgs, orderNumber: 'ORD-1001', amount: 15000, items: [{name: 'Cement', qty: 50, price: 300}] }),
    () => emailService.sendOrderConfirmedEmail({ ...commonArgs, orderNumber: 'ORD-1001' }),
    () => emailService.sendOrderShippedEmail({ ...commonArgs, orderNumber: 'ORD-1001', trackingUrl: 'https://track.com', courierName: 'Delhivery' }),
    () => emailService.sendOrderDeliveredEmail({ ...commonArgs, orderNumber: 'ORD-1001' }),
    () => emailService.sendInvoiceGeneratedEmail({ ...commonArgs, orderNumber: 'ORD-1001', invoiceNumber: 'INV-2023', invoiceLink: 'https://invoice.com' }),

    // Core Vendors & Products
    () => emailService.sendVendorApprovedEmail(commonArgs),
    () => emailService.sendProductApprovedEmail({ ...commonArgs, productName: 'Ultratech Cement', productUrl: 'https://structbay.com/product/1' }),
    
    // Core RFQ
    () => emailService.sendRFQSubmittedEmail({ ...commonArgs, rfqNumber: 'RFQ-500' }),
    () => emailService.sendRFQVendorAssignmentEmail({ to: toEmail, vendorName: 'BuildCorp', rfqNumber: 'RFQ-500', productDetails: '50 bags Cement' }),
    () => emailService.sendRFQQuoteAcceptedEmail({ to: toEmail, vendorName: 'BuildCorp', rfqNumber: 'RFQ-500' }),
  ];

  for (let i = 0; i < tasks.length; i++) {
    await tasks[i]();
    await delay(1000); // 1s delay to prevent Gmail rate limits
  }

  console.log('\n✅ Core tests completed.');
}

runTests();
