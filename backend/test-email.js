require('dotenv').config();
const mongoose = require('mongoose');
const { sendEmail } = require('./src/services/email.service');

async function testEmail() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Sending test email to ritirai0612@gmail.com...");
    
    // We send a RAW HTML fragment to verify that `sendEmail` wraps it automatically!
    const job = await sendEmail({
      to: 'ritirai0612@gmail.com',
      subject: 'Email Formatting Test - StructBay',
      html: `
        <h3>Hello from StructBay Developer!</h3>
        <p>This is a raw HTML test email to verify that the new email interceptor is working perfectly.</p>
        <p>If you see a nice dark header with the StructBay logo, social links at the bottom, and professional fonts, then the formatting fix was a 100% success!</p>
        <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin:0; font-size: 14px; color: #166534;">✅ Master Template Auto-Wrapping is Active!</p>
        </div>
      `
    });

    console.log("Email queued successfully! Job ID:", job ? job._id : "N/A");

    // Force queue processing to run immediately for testing purposes
    const { processEmailQueue } = require('./src/workers/emailWorker');
    await processEmailQueue();

    console.log("Queue processed.");
  } catch (error) {
    console.error("Error sending test email:", error);
  } finally {
    mongoose.disconnect();
  }
}

testEmail();
