require('dotenv').config();
const axios = require('axios');

async function exchange() {
  try {
    const code = '1005.522bded64d7c474bb8e63a27fbcd76bd.a83c34ffb60c1500c4c4155077659741';
    const clientId = process.env.ZOHO_SANDBOX_CLIENT_ID;
    const clientSecret = process.env.ZOHO_SANDBOX_CLIENT_SECRET;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', 'https://struct-bay.hsdadigital.com/api/payment/zoho/callback');
    params.append('code', code);

    const response = await axios.post(`https://accounts.zoho.in/oauth/v2/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log("SUCCESS");
    console.log(response.data);
  } catch(e) {
    console.log("ERROR");
    if(e.response) console.log(e.response.data);
    else console.log(e.message);
  }
}
exchange();
