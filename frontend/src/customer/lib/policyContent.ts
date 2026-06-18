export type PolicySection = {
  title: string;
  body: string[];
};

export type PolicyDoc = {
  slug: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: PolicySection[];
};

/** Derived from StructBay PRD — marketplace rules, delivery, cancellation, replacement, payments. */
export const POLICY_DOCS: Record<string, PolicyDoc> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    subtitle: "How StructBay collects, uses, and protects your business information.",
    lastUpdated: "17 June 2026",
    sections: [
      {
        title: "1. Who we are",
        body: [
          "StructBay is a B2B construction materials marketplace operated for builders, contractors, and procurement teams. We partner with authorised brands and city warehouses to fulfil orders placed on structbay.com.",
          "This policy explains how we handle personal and business data when you browse, register, place orders, submit RFQs, or contact support.",
        ],
      },
      {
        title: "2. Information we collect",
        body: [
          "Account details: name, company name, mobile number, email, billing address, and GST number (where provided).",
          "Order data: delivery addresses, selected city, products, quantities, payment status, invoices, and order communications.",
          "Operational data: device/browser information, IP address, cookies required for login and cart, and audit logs for security.",
          "Uploaded files: bulk enquiry attachments, RFQ details, and documents you voluntarily submit.",
        ],
      },
      {
        title: "3. How we use your information",
        body: [
          "To create and manage your customer account (guest checkout is not supported on StructBay).",
          "To validate city serviceability, calculate GST-exclusive pricing at checkout, and fulfil orders through assigned vendors or StructBay logistics.",
          "To generate tax invoices, e-way bills, delivery updates, and downloadable documents in your account.",
          "To send order confirmations, dispatch alerts, and service notifications by email and in-app dashboard.",
          "To respond to support requests, RFQs, bulk enquiries, and StructBay Finance enquiries.",
        ],
      },
      {
        title: "4. Sharing with third parties",
        body: [
          "Assigned vendors receive only the product lines and documents required to fulfil your order — not your full catalogue history.",
          "Payment partners (e.g. Zoho Payments) process transactions; we do not store full card credentials on StructBay servers.",
          "Logistics partners may receive delivery contact details when StructBay-managed delivery (Type B) is used.",
          "We do not sell personal data. Disclosure occurs only for legal compliance, fraud prevention, or with your consent.",
        ],
      },
      {
        title: "5. Data retention & security",
        body: [
          "Order, invoice, and audit records are retained as required for GST, accounting, and dispute resolution.",
          "Access to admin, vendor, and customer areas is role-based. Sensitive uploads are stored on secured cloud infrastructure.",
          "You may request correction of account details from your profile or by emailing hello@structbay.com.",
        ],
      },
      {
        title: "6. Contact",
        body: [
          "For privacy questions: hello@structbay.com | +91 70905 70505",
          "Registered office: Vidyaranyapura, Bengaluru, Karnataka, India.",
        ],
      },
    ],
  },

  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    subtitle: "Terms governing use of the StructBay B2B procurement platform.",
    lastUpdated: "17 June 2026",
    sections: [
      {
        title: "1. Platform scope",
        body: [
          "StructBay is a business-to-business marketplace for construction materials. By using the site you confirm you are procuring for a commercial project or registered business entity.",
          "Product catalogue, pricing, stock, and promotions are controlled by StructBay administrators. Vendors fulfil assigned orders but do not publish or edit catalogue data.",
        ],
      },
      {
        title: "2. Accounts & eligibility",
        body: [
          "You must register and sign in to place orders, submit RFQs, bulk enquiries, or finance applications. Guest checkout is not available.",
          "You are responsible for keeping login credentials confidential and for activity under your account.",
          "Account information provided at registration (name, company, mobile, email, billing address, GST) may pre-fill checkout fields and remain editable per order.",
        ],
      },
      {
        title: "3. Pricing, GST & city serviceability",
        body: [
          "Displayed product prices are exclusive of GST unless stated otherwise. Applicable GST is calculated at checkout based on each product's configured rate.",
          "Prices and stock are city-specific. You must select a serviceable city before shopping.",
          "If your delivery address is outside the selected serviceable city, checkout will be blocked with a serviceability message.",
          "Wholesale slab pricing may apply based on minimum order quantities (MOQ) configured per city.",
        ],
      },
      {
        title: "4. Orders & fulfilment",
        body: [
          "Placing an order constitutes an offer to purchase subject to stock confirmation and vendor assignment by StructBay.",
          "A master order number (format YYMMDD0001) may split into vendor sub-orders when multiple suppliers are involved.",
          "Fulfilment may follow Vendor Delivery (Type A) or StructBay Delivery (Type B) workflows as applicable to the products ordered.",
          "StructBay Assured and StructBay Express badges indicate quality-verified or priority-delivery eligible products where enabled by admin.",
        ],
      },
      {
        title: "5. Payments",
        body: [
          "Full payment is required — partial payments are not supported on the standard checkout flow.",
          "Payments are processed through our authorised payment gateway. Status may show as Pending, Paid, or Failed.",
          "Additional delivery charges may apply and are payable at the delivery site where notified on product, cart, checkout, and order pages.",
        ],
      },
      {
        title: "6. Invoices & documents",
        body: [
          "Tax invoices, vendor invoices, e-way bills, and related PDFs are made available in your account when uploaded or generated through the fulfilment workflow.",
          "You agree to use downloaded documents only for lawful business record-keeping and tax compliance.",
        ],
      },
      {
        title: "7. Limitation & governing law",
        body: [
          "StructBay is not liable for project delays caused by site access issues, force majeure, or incorrect address/contact details supplied by the customer.",
          "These terms are governed by the laws of India. Courts at Bengaluru, Karnataka shall have exclusive jurisdiction, subject to applicable consumer protection law.",
          "For disputes: hello@structbay.com",
        ],
      },
    ],
  },

  returns: {
    slug: "returns",
    title: "Return & Refund Policy",
    subtitle: "Cancellation, replacement, and refund rules for StructBay orders.",
    lastUpdated: "17 June 2026",
    sections: [
      {
        title: "1. Overview",
        body: [
          "Construction materials are procured for site use. Returns and refunds are limited to the conditions below and managed centrally by StructBay — not directly by vendors on the storefront.",
        ],
      },
      {
        title: "2. Order cancellation",
        body: [
          "You may cancel an order from your account only before the vendor marks it Ready for Dispatch (while status is still processing).",
          "Once fulfilment reaches Ready for Dispatch or material is dispatched, cancellation is not permitted through self-service. Contact StructBay support for exceptional cases.",
          "If cancellation is accepted before dispatch, any paid amount will be refunded per payment gateway timelines to the original payment method.",
        ],
      },
      {
        title: "3. Replacement policy (PRD)",
        body: [
          "Replacement is allowed only when:",
          "• Wrong product was delivered, or",
          "• Damaged product was delivered.",
          "All replacement requests are verified by StructBay with delivery proof, photos, and order records. Approved replacements are coordinated with the assigned vendor or StructBay logistics.",
          "Defective or non-conforming bulk materials must be reported promptly at site acceptance. Stock that has been used, cut, or mixed may not qualify for replacement.",
        ],
      },
      {
        title: "4. Refunds",
        body: [
          "Refunds, when applicable, are issued only after StructBay confirms eligibility — typically for paid orders cancelled before dispatch or for verified non-delivery / duplicate charges.",
          "Refund amount excludes non-recoverable logistics or site handling charges already incurred, where applicable.",
          "Processing time depends on your bank/payment provider after StructBay initiates the refund.",
          "Payment status REFUNDED will reflect in your order history when complete.",
        ],
      },
      {
        title: "5. How to raise a request",
        body: [
          "Sign in → My Orders → open the order → use Message StructBay or email hello@structbay.com with order number, photos, and site contact details.",
          "Include delivery challan / invoice references where available.",
        ],
      },
    ],
  },

  shipping: {
    slug: "shipping",
    title: "Shipping & Delivery Policy",
    subtitle: "How materials move from brand city warehouses to your site.",
    lastUpdated: "17 June 2026",
    sections: [
      {
        title: "1. Delivery model",
        body: [
          "StructBay sources materials from authorised brand partnerships and city warehouses. After you place an order, material is picked up and delivered to your site address.",
          "Delivery may be executed as Vendor Delivery (Type A) or StructBay Delivery (Type B) depending on product and city configuration.",
        ],
      },
      {
        title: "2. Type A — Vendor delivery",
        body: [
          "The assigned vendor arranges shipment to your site after StructBay confirms dispatch.",
          "Typical workflow: order alert → ready dispatch → dispatch confirmation → vendor invoice → StructBay invoice & e-way bill → dispatched → delivered → delivery confirmed.",
          "Tracking updates appear in your account as statuses progress.",
        ],
      },
      {
        title: "3. Type B — StructBay delivery",
        body: [
          "StructBay books logistics (e.g. Porter / Delhivery), shares invoice and e-way bill PDFs with the vendor, and coordinates pickup from the warehouse.",
          "Pickup schedule, logistics company name, and driver/coordinator contact may be recorded for your order.",
          "You receive customer-facing milestones: Order Placed → Order Processing → Out for Delivery → Partial Delivered → Full Delivery Complete.",
        ],
      },
      {
        title: "4. Additional delivery charges",
        body: [
          "The following notice applies across the storefront:",
          "Additional Delivery Charges Applicable. Charges To Be Paid At Site.",
          "This may include crane offload, floor delivery, remote location surcharges, or site-specific handling as communicated during fulfilment.",
          "Quoted product prices do not automatically include all last-mile site costs unless explicitly stated on the order.",
        ],
      },
      {
        title: "5. City serviceability",
        body: [
          "You must select a serviceable city before browsing and purchasing.",
          "Delivery address must align with StructBay's serviceable geography for the selected city. Mismatched city and address combinations are blocked at checkout.",
          "Products without stock in your selected city are not shown as purchasable for that city.",
        ],
      },
      {
        title: "6. StructBay Express",
        body: [
          "Products marked StructBay Express are eligible for same-day or priority dispatch where operational capacity allows. Express availability is shown on shop, category, and product pages.",
        ],
      },
      {
        title: "7. Delivery acceptance",
        body: [
          "Inspect material at delivery. Note shortages or visible damage on the delivery challan and notify StructBay immediately.",
          "For multi-vendor orders, lines may arrive in separate shipments aligned to each vendor sub-order.",
        ],
      },
    ],
  },
};

export { FOOTER_QUICK_LINKS } from "@shared/constants/footerQuickLinks";
