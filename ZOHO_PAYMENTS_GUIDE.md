# Zoho Payments Integration Guide (Structbay)

This document explains exactly how the Zoho Payments integration works in the Structbay backend, step-by-step. It also outlines exactly what you need to do to switch the payments from the **Sandbox (Test)** environment to the **Live (Production)** environment.

---

## 1. How the Flow Works

### A. Checkout & Payment Link Creation
1. **User Action:** Customer clicks "Proceed to Payment" on the frontend checkout page.
2. **Controller (`checkout.controller.js`):** The backend receives the order details and calls the `zohoPaymentService.createCheckoutSession(order)`.
3. **Token Caching (`zohoPayment.service.js`):** The service automatically retrieves the OAuth `refresh_token` from your `.env` file and exchanges it for an active `access_token`. It caches this token in memory for 55 minutes to prevent Zoho from blocking us for "Too many requests".
4. **Zoho API Call:** The service hits the Zoho Payments API (Sandbox or Live based on `USE_ZOHO_SANDBOX`) with the order's Grand Total and a `return_url`.
5. **Redirect:** The Zoho API returns a unique payment link. The backend forwards this link to the frontend, which redirects the user to the Zoho Checkout page.

### B. Payment Completion & Webhooks
1. **Payment:** The customer completes the payment on Zoho's secure page.
2. **Zoho Webhook:** Zoho automatically sends a POST request in the background to your server: `POST https://struct-bay.hsdadigital.com/api/payment/zoho/webhook`.
3. **Webhook Controller (`zohoWebhook.controller.js`):** 
   - It **verifies the signature** using your Webhook Secret to ensure no hacker is faking the payment.
   - It reads the `event_type` (e.g., `payment.success` or `payment_link.paid`).
   - It finds the correct order in the database using the Zoho Reference ID.
   - It updates the order status to `PAID`, saves the transaction ID, and triggers the `sendPaymentSuccessEmail` to the customer.
   - It returns `HTTP 200 OK` to Zoho so Zoho knows the webhook was received successfully.

---

## 2. Going LIVE (Production)

Currently, the system is set up for Sandbox testing. When you are ready to accept real money from real customers, follow these exact steps to switch to Live Mode:

### Step 1: Prepare Zoho Payments (Live)
1. Go to your **Live** Zoho Payments Dashboard (not Sandbox).
2. Go to **Settings > Developer Space**.
3. Create a **New API Key (ZAPI Key)** so your live account is authorized to create payment links.
4. Set up the **Live Webhook** URL: `https://struct-bay.hsdadigital.com/api/payment/zoho/webhook` and copy the **Webhook Secret**.

### Step 2: Generate Live OAuth Credentials
1. Go to the **Zoho API Console** (`api-console.zoho.in`).
2. Create a new Client ID (or use an existing one for Live).
3. Copy the **Live Client ID** and **Live Client Secret**.

### Step 3: Generate the Live Refresh Token
Unlike the Sandbox, for Live you need to use **Production Scopes**.
1. Open this exact URL in your browser (Replace `YOUR_LIVE_CLIENT_ID` and `YOUR_LIVE_ACCOUNT_ID` with actual values):
   ```
   https://accounts.zoho.in/oauth/v2/auth?response_type=code&client_id=YOUR_LIVE_CLIENT_ID&scope=ZohoPayments.payments.CREATE,ZohoPayments.payments.READ&redirect_uri=https://struct-bay.hsdadigital.com/api/payment/zoho/callback&access_type=offline&prompt=consent&soid=zohopay.YOUR_LIVE_ACCOUNT_ID
   ```
   *(Notice that the scope is `ZohoPayments.*` instead of `ZohoPaySandbox.*`, and the soid is `zohopay.*` instead of `zohopaysandbox.*`)*
2. Accept the prompt, and Zoho will redirect you to your callback URL with a `code` in the URL.
3. Exchange that `code` for your **Live Refresh Token** using Postman or a small script.

### Step 4: Update Your `.env` File
Once you have all your Live keys, open your `.env` file on the production server and update it as follows:

```env
# 1. Turn OFF Sandbox mode!
USE_ZOHO_SANDBOX=false

# 2. Fill in all the Live credentials:
ZOHO_LIVE_CLIENT_ID=your_live_client_id_here
ZOHO_LIVE_CLIENT_SECRET=your_live_client_secret_here
ZOHO_LIVE_REFRESH_TOKEN=your_new_live_refresh_token_here
ZOHO_LIVE_ACCOUNTS_URL=https://accounts.zoho.in
ZOHO_PAYMENTS_LIVE_ACCOUNT_ID=your_live_account_id_here
ZOHO_LIVE_WEBHOOK_SECRET=your_live_webhook_secret_here
```

### Step 5: Restart the Server
Restart your Node.js server to apply the `.env` changes.

```bash
npm start
```

### That's it!
Because the codebase uses `if (USE_ZOHO_SANDBOX)` checks everywhere, switching to live mode requires **zero code changes**. As soon as you set `USE_ZOHO_SANDBOX=false`, the backend will automatically start using the Live endpoints (`payments.zoho.in`) and the Live credentials.
