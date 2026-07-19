// QUICK FIX: Replace lines 860-875 in ProductDetails.tsx

// BROKEN CODE (REMOVE):
/*
                    <div className="sf-pdp-related-card__price-row">
                      {relDisc > 0 && (
                        <span className="sf-pdp-related-card__was">
                          ₹{relMrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold text-sb-orange">₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          <div className="text-[10px] text-gray-500">
                            {product?.priceIncludesGst ? `incl. ${gstPct}% GST` : "ex-GST"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No bulk pricing available for this selection.</p>
            )}
          </div>
        </div>
      )}
*/

// FIXED CODE (REPLACE WITH):
                    <div className="sf-pdp-related-card__price-row">
                      {relDisc > 0 && (
                        <span className="sf-pdp-related-card__was">
                          ₹{relMrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <span className="sf-pdp-related-card__price">
                        ₹{unit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky add */}
      {effectiveUnit > 0 && inStock ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 lg:hidden z-40">
          <button type="button" className="sf-pdp-add-cart w-full" onClick={handleAddToCart}>
            Add to cart · ₹{(effectiveUnit * qty).toLocaleString("en-IN")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// KEY CHANGES:
// 1. Removed extra <div className="text-right"> that was breaking JSX
// 2. Removed reference to undefined `price` variable (should be `unit`)
// 3. Removed reference to undefined `product` variable in nested section
// 4. Fixed closing tags - proper JSX structure
// 5. Removed stray semicolon after JSX
// 6. Properly closed the Link component
// 7. Properly closed the section component
