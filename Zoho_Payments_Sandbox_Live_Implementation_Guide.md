# Zoho Payments Integration — Sandbox First, Live Later

## Goal

Implement and fully test Zoho Payments on StructBay in the Zoho Payments **Sandbox** first. Only after the complete payment flow, webhook handling, order-status updates, failure/refund handling, and reconciliation are verified should the integration be switched to **Live/Production**.

Zoho Payments Sandbox is isolated from production. Sandbox payments are simulated; no real money is moved and no live settlement happens.

---

# PART 1 — SANDBOX SETUP

## 1. Sandbox account

Sandbox portal:
https://paymentssandbox.zoho.in/

Confirm that the StructBay sandbox account is active.

Get:
- Sandbox Account ID
- Sandbox Client ID
- Sandbox Client Secret

IMPORTANT:
- Keep Client Secret private.
- Never put Client Secret or Refresh Token in frontend code.
- Store credentials only in backend environment variables/secrets.

---

## 2. OAuth Client

In Zoho API Console create/register an **ORG** client.

Use:
- Client Type: ORG
- Client Name: StructBay Payments Sandbox
- Homepage URL: StructBay website
- Authorized Redirect URI: the backend OAuth callback URL

Example:
https://struct-bay.hsdadigital.com/api/payment/zoho/callback

The redirect URI used in the OAuth URL must exactly match the URI registered in the Zoho client.

---

# PART 2 — SANDBOX OAUTH

## 3. Required sandbox scopes

For normal payment integration use:

ZohoPaySandbox.payments.CREATE
ZohoPaySandbox.payments.READ
ZohoPaySandbox.payments.UPDATE

If webhook management is done through API, also use the required settings scopes:

ZohoPaySandbox.settings.CREATE
ZohoPaySandbox.settings.READ
ZohoPaySandbox.settings.UPDATE
ZohoPaySandbox.settings.DELETE

Add refund scopes only if the application needs API-based refunds:

ZohoPaySandbox.refunds.CREATE
ZohoPaySandbox.refunds.READ

---

## 4. Sandbox SOID

For Sandbox, SOID must be:

zohopaysandbox.{SANDBOX_ACCOUNT_ID}

Do NOT use:

zohopay.{account_id}

That format is for Live.

---

## 5. Generate Authorization URL

India data center:

https://accounts.zoho.in/oauth/v2/org/auth

Parameters:

scope=ZohoPaySandbox.payments.CREATE,ZohoPaySandbox.payments.READ,ZohoPaySandbox.payments.UPDATE
client_id=YOUR_SANDBOX_CLIENT_ID
soid=zohopaysandbox.YOUR_SANDBOX_ACCOUNT_ID
state=RANDOM_STATE
response_type=code
redirect_uri=YOUR_REGISTERED_CALLBACK_URL
access_type=offline

Example structure:

https://accounts.zoho.in/oauth/v2/org/auth?scope=ZohoPaySandbox.payments.CREATE,ZohoPaySandbox.payments.READ,ZohoPaySandbox.payments.UPDATE&client_id=YOUR_CLIENT_ID&soid=zohopaysandbox.YOUR_ACCOUNT_ID&state=YOUR_STATE&response_type=code&redirect_uri=https%3A%2F%2Fstruct-bay.hsdadigital.com%2Fapi%2Fpayment%2Fzoho%2Fcallback&access_type=offline

Open this URL in the browser while logged in as the Zoho Payments account owner/admin.

Accept the permissions.

IMPORTANT:
The authorization code returned in the callback is short-lived (about 1 minute), so exchange it immediately.

---

# PART 3 — GENERATE ACCESS TOKEN + REFRESH TOKEN

## 6. Exchange authorization code

Backend request:

POST https://accounts.zoho.in/oauth/v2/token

Parameters:

grant_type=authorization_code
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
redirect_uri=YOUR_REDIRECT_URI
code=AUTHORIZATION_CODE

Expected response contains:
- access_token
- refresh_token
- expires_in
- api_domain
- token_type

Save the refresh token securely.

Do not expose the refresh token to the browser.

---

## 7. Refresh access token

When the access token expires, use:

POST https://accounts.zoho.in/oauth/v2/token

Parameters:

refresh_token=YOUR_REFRESH_TOKEN
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
grant_type=refresh_token

The backend should automatically refresh the access token when required.

Do not ask the customer to authorize every payment.

---

# PART 4 — BACKEND ENVIRONMENT VARIABLES

Example:

ZOHO_ENV=sandbox

ZOHO_PAYMENTS_ACCOUNT_ID=YOUR_SANDBOX_ACCOUNT_ID
ZOHO_CLIENT_ID=YOUR_SANDBOX_CLIENT_ID
ZOHO_CLIENT_SECRET=YOUR_SANDBOX_CLIENT_SECRET
ZOHO_REFRESH_TOKEN=YOUR_SANDBOX_REFRESH_TOKEN

ZOHO_ACCOUNTS_URL=https://accounts.zoho.in
ZOHO_PAYMENTS_BASE_URL=https://paymentssandbox.zoho.in

ZOHO_REDIRECT_URI=https://struct-bay.hsdadigital.com/api/payment/zoho/callback

Never commit .env to Git.

---

# PART 5 — CREATE PAYMENT SESSION

## 8. Payment flow

Customer clicks Pay Now.

Backend should:

1. Validate order.
2. Calculate the final payable amount server-side.
3. Validate currency = INR.
4. Create a Zoho Payments payment session using the backend OAuth access token.
5. Store the local order ID against the Zoho payment/session ID.
6. Return only the required checkout/session information to frontend.
7. Frontend opens Zoho Checkout.
8. Customer completes the sandbox payment.
9. Zoho sends webhook event to backend.
10. Backend verifies webhook/signature.
11. Backend verifies the payment status with Zoho.
12. Only then mark the StructBay order as PAID.

NEVER mark an order as PAID only because the browser redirected to success_url.

---

# PART 6 — CALLBACK

## 9. OAuth callback

Expected backend route:

GET /api/payment/zoho/callback

This route is for the OAuth authorization callback.

It receives a temporary `code`.

It should:
- read `code`
- exchange it for access + refresh tokens
- securely store/update the refresh token
- return a simple success page/message

IMPORTANT:
The browser URL:

/api/payment/zoho/callback

showing:

Route not found: GET /api/payment/zoho/callback

means the backend route is not registered for GET, or the deployed backend does not contain that route.

The callback route is NOT the same thing as the payment webhook route.

---

# PART 7 — WEBHOOK

## 10. Webhook endpoint

Create a separate backend endpoint:

POST /api/payment/zoho/webhook

Full URL:

https://struct-bay.hsdadigital.com/api/payment/zoho/webhook

It must accept POST requests from Zoho Payments and return HTTP 200 after successful processing.

IMPORTANT:
Do NOT use the OAuth callback URL as the webhook URL.

Correct separation:

OAuth callback:
GET /api/payment/zoho/callback

Payment webhook:
POST /api/payment/zoho/webhook

---

## 11. Webhook events

At minimum handle the payment lifecycle events required by the application, including:

- payment.succeeded
- payment.failed
- payment_link.paid (if payment links are used)

The webhook handler should be idempotent because the same event may be delivered/retried.

Use:
- event_id
- payment_id
- transaction reference
- local order ID

to prevent duplicate processing.

---

# PART 8 — WEBHOOK PROCESSING LOGIC

For `payment.succeeded`:

1. Receive webhook.
2. Verify webhook authenticity/signature.
3. Read payment ID/session ID/order reference.
4. Retrieve/verify payment from Zoho API using the backend access token.
5. Confirm:
   - payment status = succeeded
   - amount matches the StructBay order
   - currency matches
   - payment belongs to the expected account
6. Mark order as PAID.
7. Save Zoho transaction/payment ID.
8. Save payment timestamp/reference.
9. Record fees/tax information if required.
10. Return HTTP 200.

For `payment.failed`:

1. Verify webhook.
2. Find the related order.
3. Mark payment attempt as FAILED.
4. Do not mark the order as paid.
5. Store failure details.
6. Return HTTP 200.

For duplicate events:
- Do not create duplicate payment records.
- Do not update an already-paid order incorrectly.

---

# PART 9 — SANDBOX TESTING

## 12. Test all important cases

Before going live test:

### Successful payment
Expected:

Order:
PENDING → PAID

Payment:
SUCCESS

Zoho:
Transaction visible in Sandbox dashboard.

### Failed payment
Expected:

Order remains unpaid / payment status FAILED.

### Duplicate webhook
Send/process the same event again.

Expected:
No duplicate order/payment update.

### Wrong amount
Webhook/payment amount must not be accepted if it does not match the order amount.

### Wrong order
Payment must not be attached to another order.

### Refresh token
Let the access token expire and verify that backend automatically gets a new access token using refresh token.

### Webhook retry
Temporarily return a non-200 response in a controlled test and verify Zoho retry behaviour.

### Refund
If refunds are implemented, test:
PAID → REFUNDED / PARTIALLY_REFUNDED as applicable.

---

# PART 10 — CURRENT ERROR TO FIX

If Zoho Developer Space shows:

Code: 404

Response:

Route not found: POST /api/payment/zoho/webhook

then Zoho is reaching the StructBay server correctly, but the deployed backend does NOT currently have a matching POST route.

Fix the backend so this exact route exists:

POST /api/payment/zoho/webhook

Also make sure:
- route is imported
- router is registered
- production deployment contains the latest backend code
- reverse proxy/server forwards `/api/payment/zoho/webhook`
- HTTPS is active
- endpoint returns HTTP 200 after valid processing

After deployment, test the endpoint with a POST request.

Opening the webhook URL directly in a browser sends GET, so a GET Route Not Found response does NOT prove the POST webhook is broken.

---

# PART 11 — DATABASE REQUIREMENTS

Recommended payment record fields:

id
order_id
zoho_payment_id
zoho_payment_session_id
zoho_transaction_reference
amount
currency
status
payment_method
fee_amount
tax_amount
net_amount
event_id
raw_webhook_reference
failure_reason
created_at
updated_at
paid_at

Add a unique constraint/index on Zoho event/payment IDs where appropriate to guarantee idempotency.

---

# PART 12 — FRONTEND REQUIREMENTS

Frontend should NOT contain:

- Client Secret
- Refresh Token
- Access Token
- webhook secret/signing key

Frontend only calls StructBay backend.

Example:

Frontend
   ↓
POST /api/payment/zoho/create-session
   ↓
StructBay Backend
   ↓
Zoho Payments Sandbox API
   ↓
Payment Session
   ↓
Zoho Checkout
   ↓
Customer Payment
   ↓
Zoho Webhook
   ↓
POST /api/payment/zoho/webhook
   ↓
StructBay Backend
   ↓
Verify payment with Zoho
   ↓
Update Order = PAID

---

# PART 13 — LIVE / PRODUCTION (DO THIS ONLY AFTER SANDBOX PASSES)

When sandbox testing is completely successful:

1. Obtain/confirm Live Zoho Payments account access.
2. Generate/register Live ORG OAuth client.
3. Get Live Client ID.
4. Get Live Client Secret.
5. Get Live Account ID.
6. Generate a Live authorization code.
7. Generate Live Access Token + Refresh Token.
8. Change OAuth scopes:

Sandbox:
ZohoPaySandbox.*

Live:
ZohoPay.*

9. Change SOID:

Sandbox:
zohopaysandbox.{account_id}

Live:
zohopay.{account_id}

10. Change API base URL:

Sandbox:
https://paymentssandbox.zoho.in

Live:
https://payments.zoho.in

11. Register/configure the production webhook.
12. Verify production webhook signature.
13. Verify settlement/bank account.
14. Disable test mode.
15. Run a controlled real-money test with a small amount.
16. Verify Zoho transaction, StructBay order status, webhook, reconciliation and settlement.

IMPORTANT:
Sandbox credentials and Live credentials are environment-specific. Do not assume the Sandbox Client ID/Secret can be reused for Live.

---

# FINAL CHECKLIST

## Sandbox

[ ] Sandbox account active
[ ] Sandbox Account ID obtained
[ ] Sandbox ORG Client ID obtained
[ ] Sandbox Client Secret obtained
[ ] Redirect URI registered
[ ] Sandbox OAuth scopes configured
[ ] Sandbox SOID configured
[ ] Authorization code generated
[ ] Access token generated
[ ] Refresh token generated
[ ] Backend env configured
[ ] Access-token refresh implemented
[ ] Create-session API working
[ ] Checkout working
[ ] Success payment tested
[ ] Failed payment tested
[ ] Webhook endpoint deployed
[ ] Webhook registered
[ ] Webhook signature verification implemented
[ ] Payment status verified server-side
[ ] Order status updated correctly
[ ] Duplicate webhook handled
[ ] Refund tested if required
[ ] Zoho Sandbox dashboard transaction verified

## Live

[ ] Live account ready
[ ] Live ORG Client ID
[ ] Live Client Secret
[ ] Live Account ID
[ ] Live OAuth tokens
[ ] Live scopes
[ ] Live SOID
[ ] Live API URL
[ ] Production webhook
[ ] Production webhook signature verification
[ ] Settlement/bank verification
[ ] Test mode disabled
[ ] Small real-money transaction verified
[ ] Order + Zoho reconciliation verified

---

## Official References

Zoho Payments Sandbox:
https://www.zoho.com/in/payments/developerdocs/sandbox/

Sandbox Setup:
https://www.zoho.com/in/payments/developerdocs/sandbox/setup/

Authentication / OAuth:
https://www.zoho.com/in/payments/api/v1/authentication/

Web Integration:
https://www.zoho.com/in/payments/developerdocs/web-integration/

Hosted Checkout:
https://www.zoho.com/in/payments/developerdocs/web-integration/hosted-checkout/

Webhooks:
https://www.zoho.com/in/payments/developerdocs/webhooks/configure/

Testing:
https://www.zoho.com/in/payments/developerdocs/sandbox/testing/
