require('dotenv').config();
const axios = require('axios');
const zohoPaymentService = require('./src/services/zohoPayment.service');

async function test() {
  try {
    console.log("Getting token...");
    const accessToken = await zohoPaymentService.getAccessToken();
    console.log("Got token.");

    const baseUrl = 'https://paymentssandbox.zoho.in/api/v1';
    const accountId = process.env.ZOHO_PAYMENTS_SANDBOX_ACCOUNT_ID;

    const payload = {
      amount: 2570,
      currency: 'INR',
      description: 'Test Order',
      return_url: 'https://struct-bay.hsdadigital.com/order-success'
    };

    console.log("Testing POST to paymentssandbox...");
    const response = await axios.post(`${baseUrl}/paymentlinks?account_id=${accountId}`, payload, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("Success:", response.data);
  } catch (err) {
    if (err.response) {
      console.error("API Error:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Error:", err.message);
    }
  }
}
test();
