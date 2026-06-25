import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, X, Loader2, Package, Check, ChevronLeft, ChevronRight, CheckSquare, Square } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

interface Product {
  _id: string;
  name: string;
  sku: string;
  slug?: string;
  images?: { url?: string; publicId?: string }[];
  category?: { _id: string; name: string } | string;
  brand?: { _id: string; name: string } | string;
  status: string;
}

interface RelationshipManagerProps {
  productId: string;
  initialUpsells?: Product[];
  initialCrossSells?: Product[];
  onSave?: () => void;
}

interface AllProductsResponse {
  data: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const PRODUCTS_PER_PAGE = 24;

export function ProductRelationshipManager({
  productId,
  initialUpsells = [],
  initialCrossSells = [],
  onSave,
}: RelationshipManagerProps) {
  const [activeTab, setActiveTab] = useState<"upsell" | "crosssell">("upsell");
  const [upsellProducts, setUpsellProducts] = useState<Product[]>(initialUpsells);
  const [crossSellProducts, setCrossSellProducts] = useState<Product[]>(initialCrossSells);

  // Sync state with props when initialUpsells/initialCrossSells change (e.g., after fetch or tab navigation)
  useEffect(() => {
    setUpsellProducts(initialUpsells);
  }, [initialUpsells]);
  useEffect(() => {
    setCrossSellProducts(initialCrossSells);
  }, [initialCrossSells]);
  
  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Available products state
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get current selection based on active tab
  const currentSelection = activeTab === "upsell" ? upsellProducts : crossSellProducts;
  const currentSelectionIds = useMemo(() => new Set(currentSelection.map(p => p._id)), [currentSelection]);

  // Fetch all available products (not selected)
  const fetchAvailableProducts = useCallback(async (page: number = 1, search: string = "") => {
    setIsLoadingProducts(true);
    try {
      const selectedIds = activeTab === "upsell" 
        ? upsellProducts.map(p => p._id)
        : crossSellProducts.map(p => p._id);
      
      const params = new URLSearchParams({
        status: "ACTIVE",
        page: String(page),
        limit: String(PRODUCTS_PER_PAGE),
      });
      
      if (search.trim()) {
        params.append("search", search.trim());
      }
      
      const res = await apiFetch(`/products?${params.toString()}`);
      const products: Product[] = Array.isArray(res.data) ? res.data : [];
      
      // Filter out current product and already selected products
      const excludeIds = new Set([productId, ...selectedIds]);
      const filteredProducts = products.filter(p => !excludeIds.has(p._id));
      
      setAllProducts(filteredProducts);
      setTotalProducts(res.pagination?.total || 0);
      setTotalPages(res.pagination?.pages || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setAllProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [productId, upsellProducts, crossSellProducts, activeTab]);

  // Initial fetch and when tab changes
  useEffect(() => {
    fetchAvailableProducts(1, searchQuery);
  }, [activeTab, fetchAvailableProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAvailableProducts(1, searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Toggle product selection
  const toggleProductSelection = (product: Product) => {
    const isSelected = currentSelectionIds.has(product._id);
    
    if (activeTab === "upsell") {
      if (isSelected) {
        setUpsellProducts(prev => prev.filter(p => p._id !== product._id));
      } else {
        setUpsellProducts(prev => [...prev, product]);
      }
    } else {
      if (isSelected) {
        setCrossSellProducts(prev => prev.filter(p => p._id !== product._id));
      } else {
        setCrossSellProducts(prev => [...prev, product]);
      }
    }
    setHasChanges(true);
  };

  // Remove product from selection
  const removeProduct = (productIndex: number) => {
    if (activeTab === "upsell") {
      setUpsellProducts(prev => prev.filter((_, i) => i !== productIndex));
    } else {
      setCrossSellProducts(prev => prev.filter((_, i) => i !== productIndex));
    }
    setHasChanges(true);
  };

  // Select all visible products
  const selectAllVisible = () => {
    const productsToAdd = allProducts.filter(p => !currentSelectionIds.has(p._id));
    
    if (activeTab === "upsell") {
      setUpsellProducts(prev => [...prev, ...productsToAdd]);
    } else {
      setCrossSellProducts(prev => [...prev, ...productsToAdd]);
    }
    setHasChanges(true);
  };

  // Deselect all products
  const deselectAll = () => {
    if (activeTab === "upsell") {
      setUpsellProducts([]);
    } else {
      setCrossSellProducts([]);
    }
    setHasChanges(true);
  };

  // Save relationships
  const saveRelationships = async () => {
    setIsSaving(true);
    try {
      await apiFetch(`/product-relationships/product/${productId}`, {
        method: "POST",
        body: JSON.stringify({
          upsells: upsellProducts.map(p => p._id),
          cross_sells: crossSellProducts.map(p => p._id),
        }),
      });
      setHasChanges(false);
      // Refresh available products list
      fetchAvailableProducts(currentPage, searchQuery);
      if (onSave) onSave();
    } catch (err: any) {
      alert(err.message || "Failed to save relationships");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions
  const getFirstImage = (product: Product) => {
    if (!product.images || product.images.length === 0) return null;
    return product.images[0]?.url || null;
  };

  const getCategoryName = (product: Product) => {
    if (typeof product.category === "object" && product.category) {
      return product.category.name;
    }
    return null;
  };

  const getBrandName = (product: Product) => {
    if (typeof product.brand === "object" && product.brand) {
      return product.brand.name;
    }
    return null;
  };

  // Check if all visible products are selected
  const allVisibleSelected = allProducts.length > 0 && allProducts.every(p => currentSelectionIds.has(p._id));
  const someSelected = allProducts.some(p => currentSelectionIds.has(p._id));

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchAvailableProducts(page, searchQuery);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setActiveTab("upsell")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "upsell"
              ? "bg-sb-orange text-white"
              : "text-sb-ink/55 hover:text-sb-ink"
          }`}
        >
          Upsell Products
          <span className="block text-xs opacity-70 mt-0.5">
            Shown in Cart Page
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("crosssell")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "crosssell"
              ? "bg-sb-orange text-white"
              : "text-sb-ink/55 hover:text-sb-ink"
          }`}
        >
          Cross-Sell Products
          <span className="block text-xs opacity-70 mt-0.5">
            Shown on Product Page
          </span>
        </button>
      </div>

      {/* Dual Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel - Available Products */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-sb-ink">Available Products</h3>
            <div className="flex items-center gap-2">
              {allProducts.length > 0 && (
                <button
                  type="button"
                  onClick={allVisibleSelected ? deselectAll : selectAllVisible}
                  className="flex items-center gap-1 text-xs text-sb-orange hover:text-sb-orange-hover font-medium px-2 py-1 rounded transition-colors"
                >
                  {allVisibleSelected ? (
                    <><X className="w-3 h-3" /> Deselect All</>
                  ) : (
                    <><Check className="w-3 h-3" /> Select All</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Search/Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sb-ink/40" />
            <input
              type="text"
              className="w-full bg-sb-cream-secondary border border-sb-ink/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange/20 transition-colors"
              placeholder="Filter products by name, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sb-ink/40 hover:text-sb-ink"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Products List */}
          <div className="border border-sb-ink/10 rounded-lg bg-sb-cream-secondary max-h-[400px] overflow-y-auto">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-sb-orange" />
              </div>
            ) : allProducts.length === 0 ? (
              <div className="text-center py-8 text-sb-ink/40 text-sm">
                {searchQuery ? "No products match your filter." : "No available products."}
              </div>
            ) : (
              <div className="divide-y divide-sb-ink/5">
                {allProducts.map((product) => {
                  const isSelected = currentSelectionIds.has(product._id);
                  return (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => toggleProductSelection(product)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-sb-cream-tertiary ${
                        isSelected ? "bg-sb-cream-tertiary" : ""
                      }`}
                    >
                      <span className="shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-sb-orange" />
                        ) : (
                          <Square className="w-4 h-4 text-sb-ink/30" />
                        )}
                      </span>
                      <div className="w-10 h-10 rounded-lg bg-white border border-sb-ink/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {getFirstImage(product) ? (
                          <img src={getFirstImage(product)!} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-sb-ink/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-sb-ink truncate">{product.name}</p>
                        <p className="text-xs text-sb-ink/50 truncate">
                          {product.sku}
                          {getCategoryName(product) && ` · ${getCategoryName(product)}`}
                          {getBrandName(product) && ` · ${getBrandName(product)}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-sb-ink/50">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-sb-cream-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => goToPage(pageNum)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-sb-orange text-white"
                          : "hover:bg-sb-cream-tertiary text-sb-ink"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-sb-cream-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Selected Products */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-sb-ink">
              Selected Products ({currentSelection.length})
            </h3>
            {currentSelection.length > 0 && (
              <button
                type="button"
                onClick={deselectAll}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded transition-colors"
              >
                <X className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          <div className="border border-sb-ink/10 rounded-lg bg-sb-cream-secondary max-h-[480px] overflow-y-auto">
            {currentSelection.length === 0 ? (
              <div className="text-center py-12 text-sb-ink/40 text-sm border-2 border-dashed border-sb-ink/10 rounded-lg m-2">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No products selected.
                <br />
                <span className="text-xs">Click products on the left to add them.</span>
              </div>
            ) : (
              <div className="divide-y divide-sb-ink/5">
                {currentSelection.map((product, index) => (
                  <div
                    key={`${product._id}-${index}`}
                    className="flex items-center gap-3 p-3"
                  >
                    <span className="shrink-0">
                      <CheckSquare className="w-4 h-4 text-sb-orange" />
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-white border border-sb-ink/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {getFirstImage(product) ? (
                        <img src={getFirstImage(product)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-sb-ink/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sb-ink truncate">{product.name}</p>
                      <p className="text-xs text-sb-ink/50 truncate">
                        {product.sku}
                        {getBrandName(product) && ` · ${getBrandName(product)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="p-1.5 text-sb-ink/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={`Remove ${product.name}`}
                      title={`Remove ${product.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-2 border-t border-sb-ink/10">
          <button
            type="button"
            onClick={saveRelationships}
            disabled={isSaving}
            className="flex items-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Check className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}