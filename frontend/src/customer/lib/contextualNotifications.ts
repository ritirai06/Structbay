export type ContextualNotice = {
  id: string;
  title: string;
  message: string;
  scope: "city" | "page";
  href?: string;
};

type BuildArgs = {
  pathname: string;
  city?: string | null;
  cityId?: string | null;
  cartCount?: number;
  isLoggedIn?: boolean;
};

function pageContext(pathname: string): string {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return "home";
  if (p.startsWith("/cart")) return "cart";
  if (p.startsWith("/checkout")) return "checkout";
  if (p.startsWith("/products/") || p.startsWith("/product/")) return "product";
  if (p.startsWith("/category/") || p.startsWith("/categories/") || p.startsWith("/shop")) return "category";
  if (p.startsWith("/search")) return "search";
  if (p.startsWith("/bulk")) return "bulk";
  if (p.startsWith("/rfq")) return "rfq";
  if (p.startsWith("/orders/")) return "order-track";
  if (p.startsWith("/account")) return "account";
  if (p.startsWith("/finance")) return "finance";
  if (p.startsWith("/brands")) return "brand";
  return "other";
}

function categorySlugFromPath(pathname: string): string | null {
  const m = pathname.match(/\/(?:category|categories)\/([^/?#]+)/i);
  return m?.[1] ? decodeURIComponent(m[1]).replace(/-/g, " ") : null;
}

function cityDeliveryLine(city: string): string {
  const c = city.toLowerCase();
  if (c.includes("bengaluru") || c.includes("bangalore")) {
    return "Structbay Express: same-day delivery on select SKUs when you order before 2 pm (eligible pincodes).";
  }
  if (c.includes("hyderabad") || c.includes("telangana")) {
    return "Delivery timelines for Telangana depend on vendor stock and pincode — confirm at checkout.";
  }
  if (c.includes("mumbai") || c.includes("delhi")) {
    return "Metro fulfilment with GST invoice; site delivery charges may apply on large materials.";
  }
  return `Prices and stock shown are for ${city}. Delivery charges may apply at site where applicable.`;
}

/** City + page specific notices (not persisted — changes with navigation and city). */
export function buildContextualNotices({
  pathname,
  city,
  cityId,
  cartCount = 0,
  isLoggedIn = false,
}: BuildArgs): ContextualNotice[] {
  const notices: ContextualNotice[] = [];
  const page = pageContext(pathname);
  const cityLabel = city?.trim() || null;
  const categoryLabel = categorySlugFromPath(pathname);

  if (!cityId || !cityLabel) {
    notices.push({
      id: "city-missing",
      scope: "city",
      title: "Select your city",
      message: "Local pricing, express zones, and delivery options depend on your city. Use the location pill to update.",
      href: undefined,
    });
  } else {
    notices.push({
      id: `city-${cityId}`,
      scope: "city",
      title: `${cityLabel} — local catalog`,
      message: cityDeliveryLine(cityLabel),
    });
  }

  switch (page) {
    case "home":
      notices.push({
        id: "page-home",
        scope: "page",
        title: "Home",
        message: cityLabel
          ? `Browse materials with ${cityLabel} pricing. Use Shop for categories or Bulk Order for multi-vendor quotes.`
          : "Pick a city first to see accurate prices and delivery badges on products.",
        href: cityId ? "/shop" : undefined,
      });
      break;
    case "category":
      notices.push({
        id: "page-category",
        scope: "page",
        title: categoryLabel ? `${categoryLabel} — filters` : "Category listing",
        message: cityLabel
          ? `Prices are ex-GST for ${cityLabel}. Use price slider and brand filters; bulk slab rates apply at higher quantities on each card.`
          : "Select a city to filter by live warehouse pricing on this category.",
        href: "/bulk-enquiry",
      });
      break;
    case "product":
      notices.push({
        id: "page-product",
        scope: "page",
        title: "Product detail",
        message: cityLabel
          ? `Unit price is for ${cityLabel}. Toggle Ex-GST / Incl. GST on the card; cart stores ex-GST with product GST % at checkout.`
          : "Choose a city to load variant pricing and express delivery badges for this product.",
      });
      break;
    case "cart":
      notices.push({
        id: "page-cart",
        scope: "page",
        title: "Your cart",
        message:
          cartCount > 0
            ? `${cartCount} line(s) in cart — totals are ex-GST; GST is calculated per product. Site delivery charges are paid separately where applicable.`
            : "Cart is empty. Add items from a category — wholesale slabs apply when quantity crosses each tier.",
        href: "/shop",
      });
      break;
    case "checkout":
      notices.push({
        id: "page-checkout",
        scope: "page",
        title: "Checkout",
        message: cityLabel
          ? `Order will be fulfilled for ${cityLabel}. Verify billing GSTIN and delivery pincode before paying online.`
          : "Select a delivery city in checkout so vendors can confirm stock and logistics.",
      });
      break;
    case "search":
      notices.push({
        id: "page-search",
        scope: "page",
        title: "Search results",
        message: cityLabel
          ? `Results ranked for ${cityLabel} catalog. Open a product to see variant-wise city pricing.`
          : "Set your city to align search results with local warehouse prices.",
      });
      break;
    case "bulk":
      notices.push({
        id: "page-bulk",
        scope: "page",
        title: "Bulk enquiry",
        message: cityLabel
          ? `Quotes will consider delivery to ${cityLabel}. Attach BOQ files for faster vendor responses — login optional.`
          : "Add your city so vendors can quote freight and lead time accurately.",
        href: "/bulk-enquiry",
      });
      break;
    case "rfq":
      notices.push({
        id: "page-rfq",
        scope: "page",
        title: "RFQ / concrete",
        message: cityLabel
          ? `RFQ submissions for ${cityLabel} are routed to verified suppliers in that zone.`
          : "Select a city before submitting so suppliers see the correct service area.",
        href: "/rfq",
      });
      break;
    case "order-track":
      notices.push({
        id: "page-order",
        scope: "page",
        title: "Order tracking",
        message: "Status updates and delivery notes for this order appear here — not mixed with other cities or pages.",
      });
      break;
    case "account":
      notices.push({
        id: "page-account",
        scope: "page",
        title: "My account",
        message: isLoggedIn
          ? "Orders, invoices, and alerts below are tied to your account. Switch city in the header to browse another market."
          : "Sign in to see order history and saved addresses for your account.",
        href: "/login",
      });
      break;
    default:
      notices.push({
        id: "page-generic",
        scope: "page",
        title: "Structbay",
        message: cityLabel
          ? `You are browsing the ${cityLabel} storefront. Change city anytime from the bottom-right pill.`
          : "Select a city to unlock local pricing across the site.",
      });
  }

  return notices;
}

export function contextualPanelTitle(city?: string | null, pathname?: string): string {
  const page = pageContext(pathname || "/");
  const pageLabels: Record<string, string> = {
    home: "Home",
    category: "Category",
    product: "Product",
    cart: "Cart",
    checkout: "Checkout",
    search: "Search",
    bulk: "Bulk",
    rfq: "RFQ",
    "order-track": "Order",
    account: "Account",
    finance: "Finance",
    brand: "Brand",
    other: "Store",
  };
  const pageLabel = pageLabels[page] || "Store";
  if (city?.trim()) return `${pageLabel} · ${city.trim()}`;
  return pageLabel;
}
