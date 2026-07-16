# Variation-wise Image Upload Implementation

## Overview
This implementation adds the ability to upload and manage images for each product variation independently. When a customer selects a variation, the main product image automatically switches to the variation's image (if available), with fallback to the main product image.

## Changes Made

### Backend

#### 1. API Routes (`backend/src/routes/product.routes.js`)
Added two new endpoints for variation image management:
- `POST /:id/variations/:varId/images` - Upload images for a variation
- `DELETE /:id/variations/:varId/images/:imageId` - Delete a specific image from a variation

#### 2. Controller Handlers (`backend/src/controllers/product.controller.js`)
Added two new handler functions:
- `addVariationImages()` - Accepts an array of image objects with `url` and `publicId` fields, appends them to the variation's images array
- `removeVariationImage()` - Deletes an image from a variation by ID, also removes it from Cloudinary using the existing `deleteFile()` function

Both handlers:
- Reuse existing Cloudinary integration (no new upload system created)
- Follow the same pattern as product image handlers
- Preserve uploaded images while editing products
- Support image deletion with Cloudinary cleanup

#### 3. Database Schema
The ProductVariation schema already has an `images` field:
```javascript
images: [{ url: String, publicId: String }]
```
No schema changes were needed.

### Frontend

#### 1. New Component: VariationImageUpload (`frontend/src/admin/components/VariationImageUpload.tsx`)
A reusable image upload component with:
- Drag-and-drop support
- File picker
- Multiple file upload
- Image preview gallery
- Delete functionality with confirmation
- Error handling
- Loading states

Features:
- Accepts PNG, JPG, GIF up to 10MB
- Shows upload progress
- Displays uploaded images in a grid
- Hover to delete with visual feedback

#### 2. Updated: ProductVariantManager (`frontend/src/admin/components/ProductVariantManager.tsx`)
Enhanced the variant row component to include:
- New "Manage Images" button in the expanded variant details
- Integrated VariationImageUpload component
- Image management panel that appears when toggled
- Syncs image changes back to the parent component

The component now shows:
- Variation attributes (existing)
- Variation images (new)
- City pricing & inventory (existing)

#### 3. Existing: ProductDetails (`frontend/src/customer/pages/ProductDetails.tsx`)
The customer-facing product details page already had the logic to:
- Check for variation-specific images first
- Fall back to product images if no variation images exist
- Update the main gallery when a variation is selected
- Reset the active image index when switching variations

No changes were needed here - the feature works out of the box!

## How It Works

### Admin Flow
1. Admin navigates to a product with variants
2. Expands a variation card
3. Clicks "Manage Images" button
4. Uploads images via drag-and-drop or file picker
5. Images are uploaded to Cloudinary and stored with the variation
6. Admin can delete images with confirmation
7. Changes are saved immediately

### Customer Flow
1. Customer views a product with variants
2. Selects a variation (e.g., "Red / Medium")
3. Main product image automatically switches to the variation's image
4. If no variation image exists, falls back to the main product image
5. Image gallery updates with all available images for that variation

## API Endpoints

### Upload Images to Variation
```
POST /api/v1/products/{productId}/variations/{variationId}/images
Content-Type: application/json

{
  "images": [
    { "url": "https://...", "publicId": "..." },
    { "url": "https://...", "publicId": "..." }
  ]
}

Response: { data: { images: [...] } }
```

### Delete Image from Variation
```
DELETE /api/v1/products/{productId}/variations/{variationId}/images/{imageId}

Response: { data: { images: [...] } }
```

## Key Features

✅ **Reuses Existing Cloudinary Integration**
- No new upload system created
- Uses existing `uploadImage()`, `deleteFile()` functions
- Maintains consistency with product image uploads

✅ **Preserves Uploaded Images**
- Images persist when editing products
- Images persist when editing variations
- Soft delete support (isDeleted flag)

✅ **Fallback Logic**
- Variation images take priority
- Falls back to product images if no variation images
- Seamless customer experience

✅ **Drag & Drop Support**
- Same UX as existing product image uploader
- File picker alternative
- Multiple file upload

✅ **Image Management**
- Preview gallery
- Delete with confirmation
- Error handling
- Loading states

## Database Impact

No schema changes required. The ProductVariation model already supports:
```javascript
images: [{ url: String, publicId: String }]
```

## Testing Checklist

- [ ] Upload single image to variation
- [ ] Upload multiple images to variation
- [ ] Delete image from variation
- [ ] Verify Cloudinary cleanup on delete
- [ ] Switch between variations - images update correctly
- [ ] Fallback to product image when no variation image
- [ ] Edit product - variation images persist
- [ ] Edit variation - images persist
- [ ] Customer sees correct image on storefront
- [ ] Mobile responsiveness

## Future Enhancements

- Drag to reorder images within a variation
- Bulk image upload for multiple variations
- Image cropping/editing before upload
- Variation image templates
- Auto-generate variation images from product images
