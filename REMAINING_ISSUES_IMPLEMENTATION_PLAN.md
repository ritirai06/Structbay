# Remaining StructBay Issues - Implementation Plan

## Overview
7 issues remain to be implemented. This document provides a detailed implementation roadmap with minimal code changes.

---

## ISSUE 1: Estimated Dispatch Must Include Time

### Current State
- Vendor selects only date via `readyDate` (date input)
- Backend stores `expectedDispatchDate` as Date
- No time component

### Required Changes

#### Backend (Node.js)
**File: `backend/src/models/VendorOrder.js`**
- Change `expectedDispatchDate: Date` to store full datetime
- No schema change needed (Date already supports time)

**File: `backend/src/controllers/vendorOrderWorkflow.controller.js`**
- In `workflowReadyDispatch` endpoint:
  - Accept `estimatedDispatchDate` (date) and `estimatedDispatchTime` (time) separately
  - Combine into single datetime before saving
  - Example: `new Date(date + 'T' + time)`

**File: `backend/src/utils/vendorOrderPortal.js`**
- Update pending action message to mention time requirement

#### Frontend (React)
**File: `frontend/src/vendor/components/VendorWorkflowPanel.tsx`**
- Add `readyTime` state alongside `readyDate`
- Add time input field next to date input
- Combine both in form submission
- Update display in `SubmittedDocuments` to show both date and time

**File: `frontend/src/admin/components/order/orderDetailShared.tsx`**
- Update dispatch date display to show time component
- Format: "20 Jul 2026, 03:30 PM"

**File: `frontend/src/customer/pages/OrderDetails.tsx`** (if exists)
- Update dispatch date display similarly

### Implementation Steps
1. Update VendorOrder model to ensure datetime storage
2. Modify vendor workflow controller to accept and combine date + time
3. Add time input to vendor workflow panel
4. Update all display locations to show formatted datetime
5. Test with various time values

---

## ISSUE 2: FAQ Editor Background Bug

### Current State
- FAQ editor has dark background making text invisible
- Located in AddProduct.tsx around line 1215-1225

### Required Changes

**File: `frontend/src/admin/pages/AddProduct.tsx`**
- Find FAQ section textarea
- Change background from dark to white
- Ensure text color is dark
- Ensure cursor is visible
- Ensure placeholder is visible

### Implementation Steps
1. Locate FAQ textarea in AddProduct.tsx
2. Apply white background: `bg-white`
3. Apply dark text: `text-sb-ink`
4. Apply visible placeholder: `placeholder:text-sb-ink/40`
5. Test in both light/dark themes

---

## ISSUE 3: Remove Delivery Price Completely

### Current State
- Delivery price field exists in product creation/editing
- May be stored in database
- Used in pricing calculations

### Required Changes

#### Backend
**File: `backend/src/models/Product.js`**
- Remove any `deliveryPrice` field if exists
- Remove from validation

**File: `backend/src/models/ProductVariation.js`**
- Remove any `deliveryPrice` field if exists

**File: `backend/src/models/Inventory.js`** (if exists)
- Remove any `deliveryPrice` field if exists

**File: `backend/src/controllers/productController.js`**
- Remove delivery price from product creation payload
- Remove from product update payload
- Remove from pricing calculations

**File: `backend/src/services/pricingService.js`** (if exists)
- Remove delivery price from any calculations

#### Frontend
**File: `frontend/src/admin/pages/AddProduct.tsx`**
- Remove delivery price input field from form
- Remove from form state
- Remove from payload sent to API

**File: `frontend/src/admin/components/ProductCityConfig.tsx`**
- Remove delivery price from city configuration
- Remove from pricing display

**File: `frontend/src/admin/components/ProductVariantManager.tsx`**
- Remove delivery price from variant pricing

### Implementation Steps
1. Search codebase for "delivery" + "price" references
2. Remove from backend models
3. Remove from backend controllers
4. Remove from frontend form
5. Remove from pricing calculations
6. Test product creation/edit without delivery price

---

## ISSUE 4: Variable Product Short Description

### Current State
- Simple products display short description
- Variable products don't display short description on customer page

### Required Changes

**File: `frontend/src/customer/pages/ProductDetails.tsx`** (or similar)
- Find where simple product short description is displayed
- Apply same display logic to variable products
- Reuse existing Specifications component

### Implementation Steps
1. Locate product details page
2. Find short description display for simple products
3. Apply same logic to variable products
4. Test on both product types

---

## ISSUE 5: Unlimited Product Variations

### Current State
- May have limits on variation generation
- UI may freeze with large datasets
- API may timeout

### Required Changes

#### Backend
**File: `backend/src/controllers/productVariationController.js`**
- Implement batch insertion for variations
- Process in chunks (e.g., 1000 at a time)
- Add progress tracking

**File: `backend/src/services/variationGenerationService.js`** (create if needed)
- Generate combinations in batches
- Avoid loading all into memory
- Use streaming/pagination

#### Frontend
**File: `frontend/src/admin/components/ProductVariantManager.tsx`**
- Implement virtual scrolling for large lists
- Use pagination for variation display
- Show progress during generation
- Prevent UI freezing

### Implementation Steps
1. Implement batch variation insertion (backend)
2. Add progress tracking
3. Implement virtual scrolling (frontend)
4. Add pagination to variation list
5. Test with 10,000+ variations

---

## ISSUE 6: Paint Colour Search (Replace Huge Dropdown)

### Current State
- Colour filter shows all options in dropdown
- Unusable with 2500+ colours

### Required Changes

#### Backend
**File: `backend/src/controllers/attributeController.js`** (create if needed)
- Add endpoint: `GET /attributes/:attributeId/search?q=...`
- Search by colour code and colour name
- Support partial matching
- Return paginated results

#### Frontend
**File: `frontend/src/customer/components/ProductFilters.tsx`** (or similar)
- Detect when attribute has 100+ options
- Replace dropdown with searchable input
- Call server-side search API
- Display results as you type

### Implementation Steps
1. Create backend search endpoint for attributes
2. Detect large attribute sets in frontend
3. Replace dropdown with search input
4. Implement debounced search
5. Test with colour attributes

---

## ISSUE 7: Variation Image Upload Verification & Completion

### Current State
- Variations may not have image upload capability
- Images may not be stored per variation
- Fallback to main product image may not work

### Required Changes

#### Backend
**File: `backend/src/models/ProductVariation.js`**
- Ensure `images` array exists: `images: [{ url: String, publicId: String }]`
- Already present in current schema

**File: `backend/src/controllers/productVariationController.js`**
- Add endpoint: `POST /products/:productId/variations/:variationId/images`
- Add endpoint: `DELETE /products/:productId/variations/:variationId/images/:imageId`
- Reuse existing Cloudinary service

#### Frontend
**File: `frontend/src/admin/components/ProductVariantManager.tsx`**
- Add image upload section for each variation
- Show image preview
- Allow replace/delete
- Load existing images on edit

**File: `frontend/src/customer/pages/ProductDetails.tsx`**
- When variation is selected, show variation image
- Fallback to main product image if no variation image
- Update image on attribute selection

### Implementation Steps
1. Verify ProductVariation schema has images field
2. Create variation image upload endpoints
3. Add image upload UI to variant manager
4. Implement image selection on customer page
5. Test image fallback logic

---

## ORDER WORKFLOW (Already Implemented)

✅ Invoice upload disabled until dispatch confirmation
✅ Invoice visible in admin panel
✅ Show invoice name, upload date, uploaded by

---

## Implementation Priority

1. **ISSUE 1** (Dispatch Time) - Core workflow requirement
2. **ISSUE 2** (FAQ Background) - Quick UI fix
3. **ISSUE 3** (Remove Delivery Price) - Data cleanup
4. **ISSUE 4** (Variable Product Description) - Customer-facing
5. **ISSUE 7** (Variation Images) - Product completeness
6. **ISSUE 5** (Unlimited Variations) - Performance optimization
7. **ISSUE 6** (Colour Search) - UX improvement

---

## Testing Checklist

- [ ] Dispatch time saved and displayed correctly
- [ ] FAQ editor has white background and visible text
- [ ] Delivery price removed from all forms
- [ ] Variable products show short description
- [ ] 10,000+ variations can be created without freezing
- [ ] Colour search works with partial matching
- [ ] Variation images upload and display correctly
- [ ] No regression in existing functionality
- [ ] Performance remains stable with large datasets

---

## Files to Modify Summary

### Backend
- `backend/src/models/VendorOrder.js` - Ensure datetime support
- `backend/src/controllers/vendorOrderWorkflow.controller.js` - Accept date + time
- `backend/src/utils/vendorOrderPortal.js` - Update messages
- `backend/src/controllers/productVariationController.js` - Batch insertion, image endpoints
- `backend/src/controllers/attributeController.js` - Search endpoint (create)
- `backend/src/models/Product.js` - Remove delivery price
- `backend/src/models/ProductVariation.js` - Remove delivery price

### Frontend
- `frontend/src/vendor/components/VendorWorkflowPanel.tsx` - Add time input
- `frontend/src/admin/pages/AddProduct.tsx` - FAQ background fix, remove delivery price
- `frontend/src/admin/components/order/orderDetailShared.tsx` - Display datetime
- `frontend/src/admin/components/ProductCityConfig.tsx` - Remove delivery price
- `frontend/src/admin/components/ProductVariantManager.tsx` - Batch UI, image upload, virtual scroll
- `frontend/src/customer/pages/ProductDetails.tsx` - Show variable product description, variation images
- `frontend/src/customer/components/ProductFilters.tsx` - Colour search input

---

## Notes

- Maintain backward compatibility
- Reuse existing components and services
- Avoid breaking existing functionality
- Test thoroughly before deployment
- Consider performance with large datasets
