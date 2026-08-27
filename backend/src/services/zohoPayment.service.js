const axios = require('axios');
const logger = require('../config/logger');

let cachedToken = null;
let tokenExpiry = null;

class ZohoPaymentService {
  async getAccessToken() {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
       return cachedToken;
    }

    const useSandbox = process.env.USE_ZOHO_SANDBOX === 'true';
    const clientId = useSandbox ? process.env.ZOHO_SANDBOX_CLIENT_ID : process.env.ZOHO_LIVE_CLIENT_ID;
    const clientSecret = useSandbox ? process.env.ZOHO_SANDBOX_CLIENT_SECRET : process.env.ZOHO_LIVE_CLIENT_SECRET;
    const refreshToken = useSandbox ? process.env.ZOHO_SANDBOX_REFRESH_TOKEN : process.env.ZOHO_LIVE_REFRESH_TOKEN;
    const accountsUrl = useSandbox ? process.env.ZOHO_SANDBOX_ACCOUNTS_URL || 'https://accounts.zoho.in' : process.env.ZOHO_LIVE_ACCOUNTS_URL || 'https://accounts.zoho.in';

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(`Zoho credentials missing in .env for ${useSandbox ? 'Sandbox' : 'Live'} environment.`);
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('refresh_token', refreshToken);

      const response = await axios.post(`${accountsUrl}/oauth/v2/token`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      cachedToken = response.data.access_token;
      // expires_in is usually 3600 (seconds). We subtract 60s for buffer.
      const expiresIn = response.data.expires_in || 3600;
      tokenExpiry = Date.now() + (expiresIn * 1000) - 60000;

      return cachedToken;
    } catch (error) {
      logger.error(`Zoho getAccessToken failed: ${error.message}`);
      throw new Error('Failed to authenticate with Zoho Payments. ' + error.message);
    }
  }

  async createCheckoutSession(order) {
    try {
      const accessToken = await this.getAccessToken();
      const useSandbox = process.env.USE_ZOHO_SANDBOX === 'true';
      
      // Using Zoho Payments API
      const baseUrl = useSandbox ? 'https://paymentssandbox.zoho.in/api/v1' : 'https://payments.zoho.in/api/v1';
      const accountId = useSandbox ? process.env.ZOHO_PAYMENTS_SANDBOX_ACCOUNT_ID : process.env.ZOHO_PAYMENTS_LIVE_ACCOUNT_ID;

      let frontendUrl = process.env.CUSTOMER_URL || 'https://struct-bay.hsdadigital.com';
      // Zoho Payments requires a valid public URL, so override localhost for testing
      if (frontendUrl.includes('localhost')) {
         frontendUrl = 'https://struct-bay.hsdadigital.com';
      }
      const redirectUrl = `${frontendUrl}/order-success?orderId=${order._id}`;

      // Typical Payload for Zoho Payment Links
      const payload = {
        amount: order.grandTotal,
        currency: 'INR',
        description: `Order ${order.orderNumber} from Structbay`,
        return_url: redirectUrl
      };

      const response = await axios.post(`${baseUrl}/paymentlinks?account_id=${accountId}`, payload, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.payment_links && response.data.payment_links.url) {
        return response.data.payment_links.url;
      } else if (response.data && response.data.payment_url) {
        return response.data.payment_url;
      } else {
        throw new Error('Unexpected response format from Zoho.');
      }
    } catch (error) {
      logger.error(`Zoho createCheckoutSession failed: ${error.message}`);
      if (error.response && error.response.data) {
         logger.error(`Zoho response: ${JSON.stringify(error.response.data)}`);
         let errorMessage = error.response.data.message || error.response.data.error || 'Failed to generate Zoho Checkout Session.';
         if (error.response.data.details) {
            errorMessage += ' Details: ' + JSON.stringify(error.response.data.details);
         }
         throw new Error(errorMessage);
      }
      throw new Error('Failed to generate Zoho Checkout Session. Please try again or use another payment method.');
    }
  }
}

module.exports = new ZohoPaymentService();
