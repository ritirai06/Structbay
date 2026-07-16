# Structbay Issues - Implementation Guide

## Issues Summary and Solutions

### Issue 1: Brand Page - COMPLETED ✅
- Removed "Authorised structbay partner" text
- Fixed banner text visibility with proper background

### Issue 2: Variation Images Upload - ALREADY IMPLEMENTED ✅
- ProductVariantManager.tsx already has VariationImageUpload component
- Each variation can upload separate images

### Issue 3: Simple Product Short Description Visibility
**Status**: Need to check frontend customer product page
**Location**: `frontend/src/customer/pages/ProductDetail.tsx`
**Fix**: Ensure shortDescription is displayed in specifications section for both simple and variant products

### Issue 4: Large Variation Sets (2500+ colors)
**Status**: Need to add comment box for manual color codes
**Location**: `frontend/src/admin/components/ProductVariantManager.tsx`
**Solution**: Add a "Color Code Reference" comment box where customers can manually enter color codes and names instead of selecting from 2500+ options
**Implementation**:
- Add a text area in the product detail page for customers to enter custom color codes
- Store as a separate field: `customColorReference` in the order
- Display in order confirmation

### Issue 5: Delivery Price Field - REMOVE
**Status**: Need to remove from product pricing
**Location**: `frontend/src/admin/lib/productCityConfig.ts`
**Current**: Delivery price is shown in city pricing configuration
**Fix**: Remove deliveryPrice field from:
1. ProductCityConfig component
2. CityConfig type definition
3. Backend API payload validation
4. Frontend form submission

### Issue 6: Vendor Email Special Characters - COMPLETED ✅
**Status**: Updated Vendor model
**Changes Made**:
- Updated email regex to accept special characters: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Allows: +, -, _, . in email addresses
- Example: vendor+test@company.co.uk now works

### Issue 7: Estimated Dispatch Time Input
**Status**: Need to update VendorWorkflowPanel
**Location**: `frontend/src/vendor/components/VendorWorkflowPanel.tsx`
**Current**: Only date input, time is random
**Fix**: Add time input field alongside date
**Implementation**:
```typescript
// Change from:
<input type="date" value={readyDate} ... />

// To:
<div className="grid grid-cols-2 gap-3">
  <div className="wf-field">
    <label className="wf-field__label">Estimated dispatch date *</label>
    <input type="date" value={readyDate} ... />
  </div>
  <div className="wf-field">
    <label className="wf-field__label">Estimated dispatch time *</label>
    <input type="time" value={readyTime} onChange={e => setReadyTime(e.target.value)} />
  </div>
</div>
```

### Issue 8: FAQ Editor Black Background - NEEDS FIX
**Status**: Text background turning black when editing
**Location**: `frontend/src/admin/pages/AddProduct.tsx` (lines ~1200-1230)
**Current Issue**: Textarea has dark background making text invisible
**Fix**: Change background from `bg-sb-cream-secondary` to `bg-white` and ensure text color is `text-sb-ink`
**Changes**:
- Line 1215: Change `bg-sb-cream-secondary` to `bg-white`
- Line 1225: Change `bg-sb-cream-secondary` to `bg-white`
- Add explicit text color: `text-sb-ink`

### Issue 9: Simple Product Short Description Not Visible (Frontend)
**Status**: Need to check customer product page
**Location**: `frontend/src/customer/pages/ProductDetail.tsx`
**Current**: Short description visible for simple products but not for variant products
**Fix**: Ensure shortDescription is displayed in specifications section for both product types

### Issue 10: Variation Images Already Implemented ✅
- ProductVariantManager has VariationImageUpload component
- Each variation can have separate images
- Images are stored per variation

### Issue 11: Product Pricing - Delivery Price Field
**Status**: Need to remove from all forms
**Locations to Update**:
1. `frontend/src/admin/lib/productCityConfig.ts` - Remove deliveryPrice from CityConfig type
2. `frontend/src/admin/components/ProductCityConfig.tsx` - Remove delivery price input fields
3. Backend validation - Remove deliveryPrice from payload validation

### Issue 12: Text Visibility on Banners - COMPLETED ✅
- Fixed in BrandManagement.tsx
- Changed background from dark (#222) to light gradient
- Banner images now display clearly

### Issue 13: Vendor Email Validation - COMPLETED ✅
- Updated Vendor model with permissive regex
- Accepts special characters: +, -, _, .
- Examples that now work:
  - vendor+test@company.com
  - vendor-name@company.co.uk
  - vendor_name@company.com

## Priority Implementation Order

1. **HIGH PRIORITY**:
   - Issue 7: Add time input to estimated dispatch (VendorWorkflowPanel)
   - Issue 8: Fix FAQ editor black background (AddProduct.tsx)
   - Issue 5: Remove delivery price field from product pricing

2. **MEDIUM PRIORITY**:
   - Issue 4: Add color code reference comment box for large variation sets
   - Issue 9: Ensure short description visible for variant products

3. **LOW PRIORITY**:
   - Issue 3: Verify variation images are working correctly

## Files Already Updated

✅ `backend/src/models/Vendor.js` - Email validation updated
✅ `frontend/src/admin/pages/BrandManagement.tsx` - Banner background fixed
✅ `backend/src/utils/vendorOrderPortal.js` - Pending action message updated
✅ `backend/src/controllers/vendorOrderWorkflow.controller.js` - Dispatch confirmation check added
✅ `frontend/src/vendor/components/VendorWorkflowPanel.tsx` - Vendor invoice display added

## Files Needing Updates

⚠️ `frontend/src/vendor/components/VendorWorkflowPanel.tsx` - Add time input
⚠️ `frontend/src/admin/pages/AddProduct.tsx` - Fix FAQ editor background
⚠️ `frontend/src/admin/lib/productCityConfig.ts` - Remove delivery price
⚠️ `frontend/src/admin/components/ProductCityConfig.tsx` - Remove delivery price UI
⚠️ `frontend/src/customer/pages/ProductDetail.tsx` - Show short description for variants
⚠️ `frontend/src/admin/components/ProductVariantManager.tsx` - Add color code reference box

## Testing Checklist

- [ ] Vendor can enter email with special characters
- [ ] Estimated dispatch shows both date and time
- [ ] FAQ editor has white background with readable text
- [ ] Delivery price field is removed from product pricing
- [ ] Short description visible for variant products
- [ ] Color code reference box appears for products with 2500+ variations
- [ ] Variation images upload separately for each variation
- [ ] Brand page banners display correctly without dark background
