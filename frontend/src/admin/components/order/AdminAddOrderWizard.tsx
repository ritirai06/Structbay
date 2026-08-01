import { formatDate } from "../../../lib/formatDate";
import { useState, useEffect } from "react";
import { X, Search, ChevronRight, Package, ArrowRight, UserPlus, CheckCircle, Truck, CreditCard } from "lucide-react";
import { adminFetch } from "../../../lib/adminApi";


type WizardStep = "TYPE" | "CUSTOMER" | "PREVIOUS_ORDER" | "NEW_CUSTOMER" | "PRODUCTS" | "DELIVERY_PAYMENT" | "SUMMARY";

export function AdminAddOrderWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>("TYPE");
  const [flowType, setFlowType] = useState<"EXISTING" | "NEW" | null>(null);

  // Existing flow data
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // New customer flow data
  const [newCustomer, setNewCustomer] = useState({
    name: "", phone: "", email: "", companyName: "", gstNumber: ""
  });

  // Shared order data
  const [items, setItems] = useState<any[]>([]);
  const [shippingAddress, setShippingAddress] = useState({
    name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: ""
  });
  const [cityId, setCityId] = useState("");
  const [availableCities, setAvailableCities] = useState<any[]>([]);
  
  const [deliveryType, setDeliveryType] = useState("vendor_delivery"); // vendor_delivery or structbay_delivery
  const [paymentMethod, setPaymentMethod] = useState("Online");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");

  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);

  useEffect(() => {
    adminFetch("/cities").then(d => {
      setAvailableCities(d.data || []);
      if (d.data?.[0]) setCityId(d.data[0]._id);
    }).catch(console.error);
  }, []);

  const searchCustomers = async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) return setCustomers([]);
    try {
      const res = await adminFetch(`/admin/customers/search?q=${encodeURIComponent(q)}`);
      setCustomers(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const selectExistingCustomer = async (c: any) => {
    setSelectedCustomer(c);
    setLoading(true);
    try {
      const res = await adminFetch(`/admin/customers/${c._id}/orders`);
      setPreviousOrders(res.data || []);
      setStep("PREVIOUS_ORDER");
    } catch (e) {
      alert("Failed to fetch customer orders");
    } finally {
      setLoading(false);
    }
  };

  const selectPreviousOrder = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await adminFetch(`/orders/${orderId}`);
      const o = res.data;
      if (o) {
        setSelectedOrder(o);
        setCityId(o.city?._id || cityId);
        setShippingAddress({
          name: o.shippingAddress?.name || "",
          phone: o.shippingAddress?.phone || "",
          line1: o.shippingAddress?.line1 || "",
          line2: o.shippingAddress?.line2 || "",
          city: o.shippingAddress?.city || "",
          state: o.shippingAddress?.state || "",
          pincode: o.shippingAddress?.pincode || ""
        });
        const mappedItems = (o.items || []).map((i: any) => ({
          product: i.product?._id || i.product,
          variation: i.variation?._id || i.variation,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          gstPercentage: i.gstPercentage
        }));
        setItems(mappedItems);
        setStep("PRODUCTS");
      }
    } catch (e) {
      alert("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (q: string) => {
    setProductSearch(q);
    if (q.length < 2) return setProductResults([]);
    try {
      const res = await adminFetch(`/products?search=${encodeURIComponent(q)}`);
      setProductResults(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addProduct = (p: any) => {
    let varId = null;
    let price = p.lowestPrice || p.price || 0;
    if (p.hasVariations && p.variations?.length) {
      varId = p.variations[0]._id;
      price = p.variations[0].lowestPrice || p.variations[0].price || price;
    }
    
    setItems(prev => [...prev, {
      product: p._id,
      variation: varId,
      name: p.name,
      quantity: 1,
      unitPrice: price,
      gstPercentage: p.gstPercentage || 18
    }]);
    setProductSearch("");
    setProductResults([]);
  };

  const updateItemQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    setItems(prev => {
      const nw = [...prev];
      nw[idx].quantity = qty;
      return nw;
    });
  };

  const updateItemPrice = (idx: number, price: number) => {
    if (price < 0) return;
    setItems(prev => {
      const nw = [...prev];
      nw[idx].unitPrice = price;
      return nw;
    });
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const createOrder = async () => {
    if (!items.length) return alert("Please add at least one product.");
    setLoading(true);
    try {
      const payload = {
        isNewCustomer: flowType === "NEW",
        customer: flowType === "NEW" ? newCustomer : selectedCustomer._id,
        items,
        cityId,
        shippingAddress,
        deliveryType,
        paymentMethod,
        paymentStatus
      };
      const res = await adminFetch("/admin/orders/create-wizard", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      alert(`Order created successfully! Order Number: ${res.data.orderNumber}`);
      onClose();
    } catch (e: any) {
      alert(e.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const validateNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.email) {
      return alert("Please fill in all required customer details (*).");
    }
    const phoneDigits = newCustomer.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      return alert("Please enter a valid 10-digit phone number.");
    }
    setStep("PRODUCTS");
  };

  const validateDelivery = async () => {
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.line1 || !shippingAddress.city) {
      return alert('Please fill in all required delivery details (*).');
    }
    const phoneDigits = shippingAddress.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      return alert('Please enter a valid 10-digit delivery phone number.');
    }
    if (!shippingAddress.pincode || shippingAddress.pincode.length !== 6) {
      return alert('Please enter a valid 6-digit Pincode.');
    }
    
    setLoading(true);
    try {
      const p = new URLSearchParams({ code: shippingAddress.pincode });
      if (cityId) p.set('cityId', cityId);
      const res = await adminFetch(`/customer/serviceability/pincode?${p.toString()}`);
      if (!res.data?.serviceable) {
        setLoading(false);
        return alert(res.data?.message || res.message || "This PIN code is not in our active service area.");
      }
    } catch (e) {
      setLoading(false);
      return alert("We could not verify this PIN. Please try again.");
    }
    setLoading(false);

    setStep('SUMMARY');
  };

  const calcSubtotal = () => items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const calcGst = () => items.reduce((sum, item) => sum + ((item.unitPrice * item.quantity * item.gstPercentage) / 100), 0);
  const grandTotal = Math.round(calcSubtotal() + calcGst());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-sb-cream h-[85vh] rounded-2xl flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-sb-ink/10 bg-sb-cream-secondary">
          <h2 className="text-xl font-bold text-sb-ink flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-sb-orange" />
            Create New Order
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-sb-ink/5 rounded-full text-sb-ink"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {step === "TYPE" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-sb-ink">Choose Order Flow</h3>
              <div 
                onClick={() => { setFlowType("EXISTING"); setStep("CUSTOMER"); }}
                className="p-4 border border-sb-ink/10 rounded-xl cursor-pointer hover:border-sb-orange hover:bg-sb-orange/10 bg-sb-cream-secondary transition"
              >
                <div className="font-bold text-sb-ink">Existing Customer (Repeat Order)</div>
                <div className="text-sm text-sb-ink/60">Search for a customer and clone one of their previous orders.</div>
              </div>
              <div 
                onClick={() => { setFlowType("NEW"); setStep("NEW_CUSTOMER"); }}
                className="p-4 border border-sb-ink/10 rounded-xl cursor-pointer hover:border-sb-orange hover:bg-sb-orange/10 bg-sb-cream-secondary transition"
              >
                <div className="font-bold text-sb-ink">New Customer</div>
                <div className="text-sm text-sb-ink/60">Enter new customer details and add products manually.</div>
              </div>
            </div>
          )}

          {step === "CUSTOMER" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-sb-ink">Search Customer</h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-sb-ink/40" />
                <input 
                  value={customerSearch} 
                  onChange={e => searchCustomers(e.target.value)}
                  placeholder="Search by name, email, phone..." 
                  className="w-full pl-10 pr-4 py-3 border border-sb-ink/10 rounded-xl bg-sb-cream-secondary text-sb-ink placeholder-sb-ink/40 focus:outline-none focus:border-sb-orange" 
                  autoFocus
                />
              </div>
              <div className="space-y-2 mt-4">
                {customers.map(c => (
                  <div key={c._id} onClick={() => selectExistingCustomer(c)} className="flex items-center justify-between p-3 border border-sb-ink/10 rounded-lg hover:border-sb-orange cursor-pointer bg-sb-cream-secondary transition">
                    <div>
                      <div className="font-bold text-sb-ink">{c.name}</div>
                      <div className="text-sm text-sb-ink/60">{c.email} • {c.phone}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-sb-ink/40" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "PREVIOUS_ORDER" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-sb-ink">Select Previous Order to Clone</h3>
              <p className="text-sm text-sb-ink/60">Customer: {selectedCustomer?.name}</p>
              
              {loading ? (
                <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-sb-ink/10 rounded w-3/4"></div></div></div>
              ) : (
                <div className="space-y-3">
                  {previousOrders.length === 0 && <div className="p-4 bg-sb-cream-secondary rounded-xl text-center text-sb-ink/60">No previous orders found.</div>}
                  {previousOrders.map(o => (
                    <div key={o._id} onClick={() => selectPreviousOrder(o._id)} className="flex items-center justify-between p-4 border border-sb-ink/10 rounded-xl hover:border-sb-orange cursor-pointer bg-sb-cream-secondary transition">
                      <div>
                        <div className="font-bold text-sb-orange">{o.orderNumber}</div>
                        <div className="text-sm text-sb-ink/60">{formatDate(o.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sb-ink">₹{o.grandTotal?.toLocaleString()}</div>
                        <div className="text-xs font-semibold text-sb-ink/40">{o.status}</div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 flex justify-between">
                    <button onClick={() => setStep("CUSTOMER")} className="px-4 py-2 border border-sb-ink/10 text-sb-ink/60 rounded-lg hover:text-sb-ink">Back</button>
                    <button onClick={() => setStep("PRODUCTS")} className="px-4 py-2 bg-sb-ink text-white rounded-lg hover:bg-black/80">Skip Clone & Add Manual</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "NEW_CUSTOMER" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-sb-ink"><UserPlus className="w-5 h-5" /> Customer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1 font-bold text-sb-ink">Full Name *</label>
                  <input required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-bold text-sb-ink">Phone *</label>
                  <input required value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-bold text-sb-ink">Email *</label>
                  <input required type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-bold text-sb-ink">Company Name</label>
                  <input value={newCustomer.companyName} onChange={e => setNewCustomer({...newCustomer, companyName: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-bold text-sb-ink">GST Number</label>
                  <input value={newCustomer.gstNumber} onChange={e => setNewCustomer({...newCustomer, gstNumber: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                </div>
              </div>
              <div className="pt-4 flex justify-between">
                <button onClick={() => setStep("TYPE")} className="px-4 py-2 border border-sb-ink/10 rounded-lg text-sb-ink/60 hover:text-sb-ink hover:border-sb-ink/30 transition">Back</button>
                <button onClick={validateNewCustomer} className="px-4 py-2 bg-sb-ink text-white rounded-lg flex items-center gap-2 hover:bg-black/80 transition">Next <ArrowRight className="w-4 h-4"/></button>
              </div>
            </div>
          )}

          {step === "PRODUCTS" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-sb-ink"><Package className="w-5 h-5" /> Products</h3>
              
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-sb-ink/40" />
                <input 
                  value={productSearch} 
                  onChange={e => searchProducts(e.target.value)}
                  placeholder="Search products to add..." 
                  className="w-full pl-9 pr-4 py-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" 
                />
                {productResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-sb-cream-secondary border border-sb-ink/10 rounded shadow-lg max-h-48 overflow-y-auto">
                    {productResults.map(p => (
                      <div key={p._id} onClick={() => addProduct(p)} className="p-3 border-b border-sb-ink/5 hover:bg-sb-orange/10 cursor-pointer text-sm text-sb-ink transition">
                        <div className="font-bold">{p.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-sb-ink/5 text-sb-ink/60">
                    <tr>
                      <th className="p-3 font-semibold">Product</th>
                      <th className="p-3 font-semibold">Qty</th>
                      <th className="p-3 font-semibold">Price</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-sb-ink/40">No items added</td></tr>}
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t border-sb-ink/5 text-sb-ink">
                        <td className="p-3 font-semibold">{item.name}</td>
                        <td className="p-3">
                          <input type="number" min="1" value={item.quantity} onChange={e => updateItemQty(idx, parseInt(e.target.value)||1)} className="w-16 p-1 border border-sb-ink/10 rounded bg-sb-cream focus:outline-none focus:border-sb-orange" />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <span>₹</span>
                            <input type="number" min="0" value={item.unitPrice} onChange={e => updateItemPrice(idx, parseFloat(e.target.value)||0)} className="w-20 p-1 border border-sb-ink/10 rounded bg-sb-cream focus:outline-none focus:border-sb-orange" />
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-500/10 p-1 rounded transition"><X className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 flex justify-between">
                <button onClick={() => setStep(flowType === "NEW" ? "NEW_CUSTOMER" : "PREVIOUS_ORDER")} className="px-4 py-2 border border-sb-ink/10 rounded-lg text-sb-ink/60 hover:text-sb-ink hover:border-sb-ink/30 transition">Back</button>
                <button onClick={() => setStep("DELIVERY_PAYMENT")} className="px-4 py-2 bg-sb-ink text-white rounded-lg flex items-center gap-2 hover:bg-black/80 transition">Next <ArrowRight className="w-4 h-4"/></button>
              </div>
            </div>
          )}

          {step === "DELIVERY_PAYMENT" && (
            <div className="space-y-6">
              
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-sb-ink"><Truck className="w-5 h-5" /> Delivery Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs mb-1 font-bold text-sb-ink">City</label>
                    <select value={cityId} onChange={e => setCityId(e.target.value)} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none">
                      {availableCities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 font-bold text-sb-ink">Contact Name *</label>
                    <input required value={shippingAddress.name} onChange={e => setShippingAddress({...shippingAddress, name: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 font-bold text-sb-ink">Contact Phone *</label>
                    <input required value={shippingAddress.phone} onChange={e => setShippingAddress({...shippingAddress, phone: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs mb-1 font-bold text-sb-ink">Address Line 1 *</label>
                    <input required value={shippingAddress.line1} onChange={e => setShippingAddress({...shippingAddress, line1: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 font-bold text-sb-ink">City</label>
                    <input value={shippingAddress.city} onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 font-bold text-sb-ink">Pincode *</label>
                    <input required pattern="\d{6}" maxLength={6} title="Please enter a valid 6-digit Pincode" value={shippingAddress.pincode} onChange={e => setShippingAddress({...shippingAddress, pincode: e.target.value.replace(/\D/g, '')})} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-sb-ink"><CreditCard className="w-5 h-5" /> Payment & Logistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1 font-bold text-sb-ink">Payment Status</label>
                    <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none">
                      <option value="PENDING">Pending (Collect Later)</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 font-bold text-sb-ink">Payment Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none">
                      <option value="Online">Online Link / Razorpay</option>
                      <option value="Bank">Bank Transfer / NEFT</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs mb-1 font-bold text-sb-ink">Logistics Type</label>
                    <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)} className="w-full p-2 border border-sb-ink/10 rounded bg-sb-cream-secondary text-sb-ink focus:border-sb-orange focus:outline-none">
                      <option value="vendor_delivery">Type A - Vendor delivers directly</option>
                      <option value="structbay_delivery">Type B - Structbay pickup & delivery</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button onClick={() => setStep("PRODUCTS")} className="px-4 py-2 border border-sb-ink/10 text-sb-ink/60 rounded-lg hover:text-sb-ink hover:border-sb-ink/30 transition">Back</button>
                <button onClick={validateDelivery} className="px-4 py-2 bg-sb-ink text-white rounded-lg flex items-center gap-2 hover:bg-black/80 transition">Next <ArrowRight className="w-4 h-4"/></button>
              </div>
            </div>
          )}

          {step === "SUMMARY" && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg text-sb-ink">Order Summary</h3>
              
              {items.length > 0 && (
                <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border-b border-sb-ink/5 last:border-b-0">
                      <div>
                        <div className="font-bold text-sb-ink text-sm">{it.name}</div>
                        <div className="text-xs text-sb-ink/60">Qty: {it.quantity} {it.variationLabel && `• ${it.variationLabel}`}</div>
                      </div>
                      <div className="font-semibold text-sb-ink text-sm">₹{Math.round(it.unitPrice * it.quantity).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-sb-ink/60">Subtotal</span>
                  <span className="font-semibold text-sb-ink">₹{Math.round(calcSubtotal()).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-sb-ink/60">GST Estimated</span>
                  <span className="font-semibold text-sb-ink">₹{Math.round(calcGst()).toLocaleString()}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-sb-ink/10 flex justify-between font-bold text-lg">
                  <span className="text-sb-ink">Grand Total</span>
                  <span className="text-sb-orange">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button onClick={() => setStep("DELIVERY_PAYMENT")} className="px-4 py-2 border border-sb-ink/10 text-sb-ink/60 rounded-lg hover:text-sb-ink hover:border-sb-ink/30 transition">Back</button>
                <button 
                  onClick={createOrder} 
                  disabled={loading}
                  className="px-6 py-2 bg-sb-orange text-white font-bold rounded-lg flex items-center gap-2 hover:bg-orange-600 disabled:opacity-50 transition"
                >
                  {loading ? "Creating..." : "Confirm & Create Order"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
