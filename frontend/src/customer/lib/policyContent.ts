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

/** Derived from Structbay PRD — marketplace rules, delivery, cancellation, replacement, payments. */
export const POLICY_DOCS: Record<string, PolicyDoc> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    subtitle: "How Structbay collects, uses, and protects your business information.",
    lastUpdated: "17 June 2026",
    sections: [
      {
        title: "1. Who we are",
        body: [
          "Structbay is a B2B construction materials marketplace operated for builders, contractors, and procurement teams. We partner with authorised brands and city warehouses to fulfil orders placed on structbay.com.",
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
          "To create and manage your customer account (guest checkout is not supported on Structbay).",
          "To validate city serviceability, calculate GST-exclusive pricing at checkout, and fulfil orders through assigned vendors or Structbay logistics.",
          "To generate tax invoices, e-way bills, delivery updates, and downloadable documents in your account.",
          "To send order confirmations, dispatch alerts, and service notifications by email and in-app dashboard.",
          "To respond to support requests, RFQs, bulk enquiries, and Structbay Finance enquiries.",
        ],
      },
      {
        title: "4. Sharing with third parties",
        body: [
          "Assigned vendors receive only the product lines and documents required to fulfil your order — not your full catalogue history.",
          "Payment partners (e.g. Zoho Payments) process transactions; we do not store full card credentials on Structbay servers.",
          "Logistics partners may receive delivery contact details when Structbay-managed delivery (Type B) is used.",
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
          "Registered office: 102, Road No.4, Defence Layout, Vidyaranyapura, Bengaluru 560097, Karnataka, India.",
        ],
      },
    ],
  },

  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    subtitle: "Terms governing use of the Structbay platform.",
    lastUpdated: "1 August 2026",
    sections: [
      {
        title: "1. Acceptance of Terms",
        body: [
          "By accessing, browsing, or using the services provided by StructBay (collectively referred to as “the Platform”), you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions and any other policies referenced herein. If you do not agree to these Terms, you should not use the Platform. These Terms constitute a legally binding agreement between you and StructBay. StructBay reserves the right to modify these Terms at any time, and your continued use of the Platform after such modifications will be deemed acceptance of the revised terms.",
        ],
      },
      {
        title: "2. Account Registration",
        body: [
          "• 2.1 In order to access certain features of the Platform, users must create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information as needed to maintain its accuracy.",
          "• 2.2 You must be at least 18 years old to register for an account and use the services on the Platform. If you are under 18, you may only use the Platform with the involvement of a parent or guardian.",
          "• 2.3 Users are responsible for maintaining the confidentiality of their login credentials, including their username and password. You agree to notify StructBay immediately if you suspect any unauthorized use of your account or any other security breach.",
          "• 2.4 You agree not to share your account or allow others to use it without express permission from StructBay. You are responsible for all activities that occur under your account, whether authorized by you or not.",
          "• 2.5 StructBay reserves the right to suspend or terminate any account that is found to be in violation of these Terms, including, but not limited to, providing false information, engaging in fraudulent activity, or using the account for illegal purposes.",
        ],
      },
      {
        title: "3. Orders & Payments",
        body: [
          "• 3.1 When you place an order on the Platform, you are making an offer to purchase the products in your order. The order will only be confirmed and processed upon full payment receipt. StructBay reserves the right to cancel orders if payment is not completed or if there are issues with payment processing.",
          "• 3.2 Prices, promotions, and product availability are subject to change at any time. While we make every effort to keep our website up to date, the prices and availability displayed at the time of purchase are final. In the case of an error in pricing or availability, StructBay will contact the customer to resolve the issue, including canceling the order and issuing a refund if necessary.",
          "• 3.3 Users must ensure that all information provided during the checkout process is accurate, including billing information, shipping address, and contact details. Any incorrect or incomplete information may result in delays or issues with your order.",
          "• 3.4 You agree to provide a valid payment method to complete your order. Payments must be made in full, and any applicable taxes, shipping, and handling charges will be added to your order total. StructBay accepts various forms of payment, and the available methods will be displayed during checkout.",
          "• 3.5 StructBay reserves the right to reject or cancel any order for reasons such as the unavailability of products, suspected fraud, or any other unforeseen circumstances that might arise.",
        ],
      },
      {
        title: "4. Shipping & Delivery",
        body: [
          "• 4.1 StructBay strives to process and ship orders within 3 business days of payment confirmation, although delivery times may vary depending on the location, product availability, and other logistical factors.",
          "• 4.2 Delivery times provided on the Platform are estimates only. StructBay is not responsible for delays caused by third-party shipping companies, weather conditions, customs inspections, or other unforeseen circumstances outside of our control.",
          "• 4.3 Users are responsible for providing accurate and complete shipping details at the time of order placement. If incorrect or incomplete information is provided, additional charges may apply to correct the shipping details, or delivery may be delayed.",
          "• 4.4 Risk of loss or damage to the products passes to the customer once the products are delivered to the specified address. Any claims for damaged or missing goods must be made directly to the carrier or with StructBay within 3 days of delivery.",
          "• 4.5 StructBay will provide tracking information for your order once it has been shipped. However, delivery dates and times are subject to change, and StructBay is not responsible for any shipping delays or errors.",
        ],
      },
      {
        title: "5. Returns & Refunds",
        body: [
          "• 5.1 To request a return or refund, users must provide a video recording of the unboxing process. This helps verify the condition of the product at the time of receipt and is necessary for return or refund requests. This policy applies to both damaged or defective products and any errors in the order.",
          "• 5.2 Returns are accepted within 3 days of the delivery date for products that are defective, damaged, or incorrectly shipped. Returns outside of this window will not be processed unless the product is deemed to be defective by StructBay.",
          "• 5.3 Custom orders, bulk orders, or products marked as non-returnable at the time of purchase are not eligible for returns, except in cases where the product is defective or damaged upon arrival.",
          "• 5.4 Once your return is received and inspected, StructBay will either issue a refund or send a replacement product, depending on your preference. Refunds will be processed to the original payment method, and please note that it may take up to 10 business days for the refund to reflect in your account.",
          "• 5.5 Shipping costs for returned products are the responsibility of the customer, except in cases of product damage or error on the part of StructBay. Original shipping charges are non-refundable unless the product is deemed defective.",
          "• 5.6 If you receive a product that is defective or damaged, please contact StructBay within 3 days of delivery to initiate the return or exchange process.",
        ],
      },
      {
        title: "6. Prohibited Activities",
        body: [
          "• 6.1 Users agree not to engage in any activities that could harm or disrupt the functioning of the Platform, including, but not limited to:",
          "  o Attempting to interfere with the Platform’s security features or infrastructure.",
          "  o Uploading or transmitting harmful code, viruses, or malware that could damage the Platform or its users.",
          "  o Using automated systems or software to access or scrape content from the Platform without express permission from StructBay.",
          "• 6.2 Users are prohibited from engaging in fraudulent activities, including, but not limited to:",
          "  o Providing false, misleading, or deceptive information during registration, transactions, or communications with StructBay.",
          "  o Using stolen payment information or engaging in any form of payment fraud.",
          "  o Participating in scams or using the Platform to facilitate illegal activities.",
          "• 6.3 Users must not infringe upon the intellectual property rights of StructBay or any third party, including unauthorized reproduction, distribution, or modification of content found on the Platform.",
          "• 6.4 Any violations of these terms may result in the suspension or termination of your account and legal action where applicable.",
        ],
      },
      {
        title: "7. Liability & Disclaimers",
        body: [
          "• 7.1 StructBay provides the Platform and products on an “as-is” basis, without warranties or guarantees of any kind, either express or implied, including, but not limited to, the accuracy, reliability, or suitability of the products for a specific purpose.",
          "• 7.2 StructBay does not warrant that the Platform will be error-free or uninterrupted, or that defects will be corrected. Users agree to use the Platform at their own risk.",
          "• 7.3 StructBay is not responsible for any damages, losses, or injuries resulting from improper use of the products purchased on the Platform, including but not limited to installation errors, misuse, or failure to follow safety instructions provided with the product.",
          "• 7.4 StructBay is not responsible for any indirect, incidental, special, or consequential damages arising from the use or inability to use the Platform, including loss of profit, data, or goodwill. Our liability is limited to the amount paid by you for the products that gave rise to the claim.",
          "• 7.5 Any disputes or legal claims arising from these Terms & Conditions will be governed by the laws of India, and any legal proceedings must be brought in the courts of India.",
        ],
      },
      {
        title: "8. Changes to Terms",
        body: [
          "• 8.1 StructBay reserves the right to modify, amend, or update these Terms & Conditions at any time. Any changes will be posted on the Platform, and the revised Terms will be effective immediately upon posting.",
          "• 8.2 You agree to review these Terms periodically and your continued use of the Platform constitutes your acceptance of any changes. If you do not agree with the updated Terms, you should discontinue use of the Platform.",
        ],
      },
      {
        title: "9. Privacy Policy",
        body: [
          "• 9.1 Your use of the Platform is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By agreeing to these Terms, you also consent to the terms outlined in the Privacy Policy, which can be accessed through the Platform.",
        ],
      },
      {
        title: "10. Contact Information",
        body: [
          "For any questions, concerns, or legal inquiries regarding these Terms & Conditions, please contact StructBay at:",
          "📧 Email: hello@structbay.com",
        ],
      },
    ],
  },

  returns: {
    slug: "returns",
    title: "Return & Refund Policy",
    subtitle: "Cancellation, replacement, and refund rules for Structbay orders.",
    lastUpdated: "17 June 2026",
    sections: [
      {
        title: "1. Overview",
        body: [
          "Construction materials are procured for site use. Returns and refunds are limited to the conditions below and managed centrally by Structbay — not directly by vendors on the storefront.",
        ],
      },
      {
        title: "2. Order cancellation",
        body: [
          "You may cancel an order from your account only before the vendor marks it Ready for Dispatch (while status is still processing).",
          "Once fulfilment reaches Ready for Dispatch or material is dispatched, cancellation is not permitted through self-service. Contact Structbay support for exceptional cases.",
          "If cancellation is accepted before dispatch, any paid amount will be refunded per payment gateway timelines to the original payment method.",
        ],
      },
      {
        title: "3. Replacement policy (PRD)",
        body: [
          "Replacement is allowed only when:",
          "• Wrong product was delivered, or",
          "• Damaged product was delivered.",
          "All replacement requests are verified by Structbay with delivery proof, photos, and order records. Approved replacements are coordinated with the assigned vendor or Structbay logistics.",
          "Defective or non-conforming bulk materials must be reported promptly at site acceptance. Stock that has been used, cut, or mixed may not qualify for replacement.",
        ],
      },
      {
        title: "4. Refunds",
        body: [
          "Refunds, when applicable, are issued only after Structbay confirms eligibility — typically for paid orders cancelled before dispatch or for verified non-delivery / duplicate charges.",
          "Refund amount excludes non-recoverable logistics or site handling charges already incurred, where applicable.",
          "Processing time depends on your bank/payment provider after Structbay initiates the refund.",
          "Payment status REFUNDED will reflect in your order history when complete.",
        ],
      },
      {
        title: "5. How to raise a request",
        body: [
          "Sign in → My Orders → open the order → use Message Structbay or email hello@structbay.com with order number, photos, and site contact details.",
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
          "Structbay sources materials from authorised brand partnerships and city warehouses. After you place an order, material is picked up and delivered to your site address.",
          "Delivery may be executed as Vendor Delivery (Type A) or Structbay Delivery (Type B) depending on product and city configuration.",
        ],
      },
      {
        title: "2. Type A — Vendor delivery",
        body: [
          "The assigned vendor arranges shipment to your site after Structbay confirms dispatch.",
          "Typical workflow: order alert → ready dispatch → dispatch confirmation → vendor invoice → Structbay invoice & e-way bill → dispatched → delivered → delivery confirmed.",
          "Tracking updates appear in your account as statuses progress.",
        ],
      },
      {
        title: "3. Type B — Structbay delivery",
        body: [
          "Structbay books logistics (e.g. Porter / Delhivery), shares invoice and e-way bill PDFs with the vendor, and coordinates pickup from the warehouse.",
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
          "Delivery address must align with Structbay's serviceable geography for the selected city. Mismatched city and address combinations are blocked at checkout.",
          "Products without stock in your selected city are not shown as purchasable for that city.",
        ],
      },
      {
        title: "6. Structbay Express",
        body: [
          "Products marked Structbay Express are eligible for same-day or priority dispatch where operational capacity allows. Express availability is shown on shop, category, and product pages.",
        ],
      },
      {
        title: "7. Delivery acceptance",
        body: [
          "Inspect material at delivery. Note shortages or visible damage on the delivery challan and notify Structbay immediately.",
          "For multi-vendor orders, lines may arrive in separate shipments aligned to each vendor sub-order.",
        ],
      },
    ],
  },
};

export { FOOTER_QUICK_LINKS } from "@shared/constants/footerQuickLinks";
