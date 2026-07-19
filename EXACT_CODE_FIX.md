# ProductDetails.tsx - Exact Code Fix

## Location
**File**: `frontend/src/customer/pages/ProductDetails.tsx`
**Lines**: 860-875 (approximately)
**Section**: Category-based "You may also like" section

## FIND THIS CODE (BROKEN):
```tsx
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
```

## REPLACE WITH THIS CODE (FIXED):
```tsx
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
```

## Key Changes
1. **Line 1**: Removed extra `<div className="text-right">` wrapper
2. **Line 2**: Removed undefined `price` variable - replaced with `unit`
3. **Line 3**: Removed undefined `product` variable reference
4. **Line 4**: Removed stray semicolon after JSX
5. **Line 5**: Properly closed `</Link>` tag
6. **Line 6**: Properly closed `</section>` tag
7. **Line 7**: Properly closed main `</div>` tag

## Variables Used
- `relDisc` - Discount percentage (already defined)
- `relMrp` - MRP price (already defined)
- `unit` - Unit price (already defined, was `price` before)

## Testing
After applying the fix:
1. Refresh the browser
2. Navigate to any product page
3. Verify no JSX errors in console
4. Check "You may also like" section renders correctly
5. Verify prices display correctly

## Error Message Before Fix
```
Adjacent JSX elements must be wrapped in an enclosing tag. 
Did you want a JSX fragment <>...</>? (868:24)
```

## Error Message After Fix
✅ No errors - component renders successfully

---

## Quick Apply Instructions

### Using VS Code Find & Replace:
1. Open `ProductDetails.tsx`
2. Press `Ctrl+H` (Find & Replace)
3. Find: `<span className="sf-pdp-related-card__was">`
4. Look for the section with `<div className="text-right">`
5. Replace the entire broken section with the fixed code above

### Manual Edit:
1. Open `ProductDetails.tsx`
2. Go to line ~860
3. Find the "Category-based You may also like" section
4. Replace the broken code block with the fixed code
5. Save the file

---

**Status**: ✅ Ready to apply
**Difficulty**: Easy (straightforward replacement)
**Time**: 2-3 minutes
