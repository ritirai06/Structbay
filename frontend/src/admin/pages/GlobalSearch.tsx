import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { adminFetch } from "../../lib/adminApi";
import { adminPath } from "../../lib/portalRoutes";
import { Search, Package, ShoppingCart, Users, Truck, FileText } from "lucide-react";
import { formatDate } from "../../lib/formatDate";

type SearchResponse = {
  query: string;
  orders: any[];
  vendorOrders: any[];
  bulkEnquiries: any[];
  concreteRfqs: any[];
  shipments: any[];
  financeApplications: any[];
  customers: any[];
  vendorsLegacy: any[];
  products: any[];
  cities: any[];
  vendorInvoices: any[];
  orderDocuments: any[];
  allocations: any[];
};

export function GlobalSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError("");
    
    adminFetch<{ data: SearchResponse }>(`/admin/reference-search?q=${encodeURIComponent(query)}&limit=10`)
      .then((res) => {
        setResults(res.data as unknown as SearchResponse);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch search results");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [query]);

  if (!query) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-sb-ink mb-6">Global Search</h1>
        <p className="text-gray-500">Enter a search term in the header to find matching records.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center">
        <p className="text-gray-500 font-medium">Searching for "{query}"...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          <p className="font-semibold">Search failed</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const hasResults = 
    results.orders?.length > 0 ||
    results.vendorOrders?.length > 0 ||
    results.products?.length > 0 ||
    results.customers?.length > 0 ||
    results.vendorsLegacy?.length > 0 ||
    results.bulkEnquiries?.length > 0 ||
    results.concreteRfqs?.length > 0 ||
    results.shipments?.length > 0 ||
    results.vendorInvoices?.length > 0;

  return (
    <div className="p-6 md:p-8 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sb-ink">Search Results</h1>
        <p className="text-sm text-gray-500 mt-1">Showing results for: <span className="font-semibold text-black">"{query}"</span></p>
      </div>

      {!hasResults ? (
        <div className="bg-white rounded-xl shadow-sm border border-black/5 p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-black">No results found</h3>
          <p className="text-sm text-gray-500 mt-1">We couldn't find anything matching your search term.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          
          {/* Products */}
          {results.products?.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-gray-50/50 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-black">Products</h2>
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{results.products.length}</span>
              </div>
              <div className="divide-y divide-black/5">
                {results.products.map(p => (
                  <div key={p._id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-black">{p.name}</div>
                      <div className="text-sm text-gray-500">Ref: {p.referenceNumber} • SKU: {p.sku || 'N/A'} • Status: {p.status}</div>
                    </div>
                    <Link to={adminPath(`products?search=${p.referenceNumber}`)} className="text-sm font-medium text-[#E85A00] hover:underline">View in Catalog</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Master Orders */}
          {results.orders?.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-gray-50/50 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-black">Master Orders</h2>
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{results.orders.length}</span>
              </div>
              <div className="divide-y divide-black/5">
                {results.orders.map(o => (
                  <div key={o._id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-black">{o.orderNumber}</div>
                      <div className="text-sm text-gray-500">Status: {o.status} • Total: ₹{o.grandTotal} • Date: {formatDate(o.createdAt)}</div>
                    </div>
                    <Link to={adminPath(`orders?search=${o.orderNumber}`)} className="text-sm font-medium text-[#E85A00] hover:underline">View Order</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vendor Orders */}
          {results.vendorOrders?.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-gray-50/50 flex items-center gap-2">
                <Truck className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-black">Vendor Orders</h2>
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{results.vendorOrders.length}</span>
              </div>
              <div className="divide-y divide-black/5">
                {results.vendorOrders.map(vo => (
                  <div key={vo._id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-black">{vo.orderNumber}</div>
                      <div className="text-sm text-gray-500">Status: {vo.status} • Total: ₹{vo.totalAmount} • Date: {formatDate(vo.createdAt)}</div>
                    </div>
                    <Link to={adminPath(`dispatch?search=${vo.orderNumber}`)} className="text-sm font-medium text-[#E85A00] hover:underline">View Dispatch</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Customers */}
          {results.customers?.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-gray-50/50 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-black">Customers</h2>
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{results.customers.length}</span>
              </div>
              <div className="divide-y divide-black/5">
                {results.customers.map(c => (
                  <div key={c._id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-black">{c.name}</div>
                      <div className="text-sm text-gray-500">Ref: {c.referenceNumber} • Email: {c.email} • Company: {c.companyName || 'N/A'}</div>
                    </div>
                    <Link to={adminPath(`customers?search=${c.referenceNumber}`)} className="text-sm font-medium text-[#E85A00] hover:underline">View Customer</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vendors */}
          {results.vendorsLegacy?.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-gray-50/50 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-black">Vendors</h2>
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{results.vendorsLegacy.length}</span>
              </div>
              <div className="divide-y divide-black/5">
                {results.vendorsLegacy.map(v => (
                  <div key={v._id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-black">{v.companyName}</div>
                      <div className="text-sm text-gray-500">Ref: {v.referenceNumber} • Email: {v.email}</div>
                    </div>
                    <Link to={adminPath(`vendors?search=${v.referenceNumber}`)} className="text-sm font-medium text-[#E85A00] hover:underline">View Vendor</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Other Categories (RFQs, Bulk Enquiries, etc.) */}
          {(results.bulkEnquiries?.length > 0 || results.concreteRfqs?.length > 0) && (
            <section className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-gray-50/50 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-black">Enquiries & RFQs</h2>
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                  {(results.bulkEnquiries?.length || 0) + (results.concreteRfqs?.length || 0)}
                </span>
              </div>
              <div className="divide-y divide-black/5">
                {results.bulkEnquiries?.map(b => (
                  <div key={b._id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-black">Bulk Enquiry: {b.enquiryNumber}</div>
                      <div className="text-sm text-gray-500">Customer: {b.customerName} • Status: {b.status}</div>
                    </div>
                    <Link to={adminPath(`bulk-enquiries?search=${b.enquiryNumber}`)} className="text-sm font-medium text-[#E85A00] hover:underline">View</Link>
                  </div>
                ))}
                {results.concreteRfqs?.map(r => (
                  <div key={r._id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-black">Concrete RFQ: {r.rfqNumber}</div>
                      <div className="text-sm text-gray-500">Customer: {r.customerName} • Status: {r.status}</div>
                    </div>
                    <Link to={adminPath(`rfqs?search=${r.rfqNumber}`)} className="text-sm font-medium text-[#E85A00] hover:underline">View</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}
