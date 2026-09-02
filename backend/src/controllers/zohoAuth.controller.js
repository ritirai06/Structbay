const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const asyncHandler = require('../utils/asyncHandler');

exports.zohoCallback = asyncHandler(async (req, res) => {
  const { code, location, 'accounts-server': accountsServer, error } = req.query;

  if (error) {
    logger.error(`Zoho OAuth Error: ${error}`);
    return res.status(400).json({ success: false, message: `Zoho OAuth Error: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ success: false, message: 'Authorization code missing' });
  }

  try {
    const useSandbox = process.env.USE_ZOHO_SANDBOX === 'true';
    const clientId = useSandbox ? process.env.ZOHO_SANDBOX_CLIENT_ID : process.env.ZOHO_LIVE_CLIENT_ID;
    const clientSecret = useSandbox ? process.env.ZOHO_SANDBOX_CLIENT_SECRET : process.env.ZOHO_LIVE_CLIENT_SECRET;
    // Exactly as registered in Zoho per user instructions
    const redirectUri = 'https://struct-bay.hsdadigital.com/api/payment/zoho/callback';

    if (!clientId || !clientSecret) {
       return res.status(500).json({ success: false, message: 'Zoho client credentials not configured in backend .env' });
    }

    const tokenUrl = 'https://accounts.zoho.in/oauth/v2/token';
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;

    if (data.error) {
      logger.error(`Zoho Token Exchange Error: ${data.error}`);
      return res.status(400).json({ success: false, message: data.error, details: data });
    }

    const refreshToken = data.refresh_token;

    if (refreshToken) {
      // Securely store refresh token in .env file
      const envPath = path.resolve(__dirname, '../../.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      const tokenKey = useSandbox ? 'ZOHO_SANDBOX_REFRESH_TOKEN' : 'ZOHO_LIVE_REFRESH_TOKEN';
      if (envContent.includes(`${tokenKey}=`)) {
        const regex = new RegExp(`${tokenKey}=.*`, 'g');
        envContent = envContent.replace(regex, `${tokenKey}=${refreshToken}`);
      } else {
        envContent += `\n${tokenKey}=${refreshToken}\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      process.env[tokenKey] = refreshToken; // Update current process env

      logger.info('Zoho refresh token successfully generated and saved to .env');
    }

    // Return a clean success response
    return res.status(200).send(`
      <html>
        <head><title>Zoho OAuth Success</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #4CAF50;">✅ Zoho OAuth Successful</h2>
          <p>The authorization code was successfully exchanged for tokens.</p>
          <p>Refresh token securely stored in backend.</p>
          <p>You can close this window and proceed with the Zoho Payments integration.</p>
        </body>
      </html>
    `);

  } catch (err) {
    logger.error(`Zoho OAuth Callback Exception: ${err.message}`);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to exchange token with Zoho', 
      error: err.response?.data || err.message 
    });
  }
});
