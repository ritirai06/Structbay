# Variation Image Upload - Code Structure

## File Changes Summary

### Backend Files Modified

#### 1. `backend/src/routes/product.routes.js`
**Changes:** Added 2 new routes
```javascript
// Line ~24-25 (after updateVariation route)
router.post('/:id/variations/:varId/images', ...adminOnly, ctrl.addVariationImages);
router.delete('/:id/variations/:varId/images/:imageId', ...adminOnly, ctrl.removeVariationImage);
```

**Purpose:** Define endpoints for variation image upload and deletion

---

#### 2. `backend/src/controllers/product.controller.js`
**Changes:** Added 2 new handler functions + updated exports

**New Functions:**

```javascript
// Lines ~1100-1110 (after deleteVariation function)
const addVariationImages = asyncHandler(async (req, res) => {
  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id });
  if (!variation) throw new AppError('Variation not found.', 404);
  if (!req.body.images || !Array.isArray(req.body.images)) throw new AppError('images array is required.', 400);
  variation.images.push(...req.body.images);
  await variation.save();
  return ApiResponse.success(res, 200, 'Images added.', variation);
});

const removeVariationImage = asyncHandler(async (req, res) => {
  const variation = await ProductVariation.findOne({ _id: req.params.varId, product: req.params.id });
  if (!variation) throw new AppError('Variation not found.', 404);
  const img = variation.images.id(req.params.imageId);
  if (img?.publicId) await deleteFile(img.publicId).catch(() => {});
  variation.images = variation.images.filter(i => i._id.toString() !== req.params.imageId);
  await variation.save();
  return ApiResponse.success(res, 200, 'Image removed.', variation);
});
```

**Updated Exports:**
```javascript
// Line ~1200 (module.exports)
module.exports = {
  // ... existing exports ...
  getVariations, createVariation, updateVariation, deleteVariation, 
  addVariationImages, removeVariationImage,  // ← NEW
  // ... rest of exports ...
};
```

**Purpose:** Handle image upload/deletion for variations, reuse Cloudinary integration

---

### Frontend Files Created

#### 1. `frontend/src/admin/components/VariationImageUpload.tsx` (NEW)
**Size:** ~150 lines
**Purpose:** Reusable image upload component for variations

**Key Features:**
- Drag-and-drop file upload
- File picker alternative
- Multiple file support
- Image preview gallery
- Delete with confirmation
- Error handling
- Loading states

**Props:**
```typescript
type Props = {
  productId: string;
  variationId: string;
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  disabled?: boolean;
};
```

**Key Functions:**
- `handleFiles()` - Process uploaded files
- `deleteImage()` - Remove image with confirmation
- Renders upload zone and image gallery

---

### Frontend Files Modified

#### 2. `frontend/src/admin/components/ProductVariantManager.tsx` (UPDATED)
**Changes:** Integrated VariationImageUpload component

**New Imports:**
```typescript
import { Image } from "lucide-react";
import { VariationImageUpload } from "./VariationImageUpload";
```

**Updated SimpleVariantRow Component:**
- Added `productId` prop
- Added `onImagesChange` callback prop
- Added `showImages` state
- Added "Manage Images" button
- Added image upload panel (conditional render)

**New Handler:**
```typescript
const handleVariantImagesChange = (variantId: string, images: any[]) => {
  onVariationsChange(
    variations.map((v) => (String(v._id) === variantId ? { ...v, images } : v))
  );
};
```

**Updated SimpleVariantRow Props:**
```typescript
type SimpleVariantRowProps = {
  // ... existing props ...
  productId: string;  // ← NEW
  onImagesChange: (images: any[]) => void;  // ← NEW
};
```

---

#### 3. `frontend/src/customer/pages/ProductDetails.tsx` (NO CHANGES)
**Status:** Already supports variation images!

**Existing Logic (lines ~150-160):**
```typescript
const displayImages = useMemo(() => {
  const fromVar = (selectedVar?.images || [])
    .map((i: any) => (typeof i === "string" ? i : i?.url))
    .filter(Boolean);
  if (fromVar.length) return fromVar as string[];
  return (product?.images || [])
    .map((i: any) => (typeof i === "string" ? i : i?.url))
    .filter(Boolean) as string[];
}, [product?.images, selectedVar?.images]);
```

This already:
- Checks variation images first
- Falls back to product images
- Updates when variation changes
- Resets image index on variation switch

---

## Data Flow

### Upload Flow
```
Admin UI (VariationImageUpload)
    ↓
handleFiles() - Process files
    ↓
adminFetch() - POST to backend
    ↓
addVariationImages() - Save to DB
    ↓
Cloudinary - Store images
    ↓
Response with updated variation
    ↓
onImagesChange() - Update parent state
    ↓
ProductVariantManager - Re-render
```

### Display Flow
```
Customer selects variation
    ↓
selectedVid state updates
    ↓
displayImages useMemo recalculates
    ↓
Check selectedVar.images first
    ↓
If empty, use product.images
    ↓
Gallery updates with new images
```

### Delete Flow
```
Admin clicks delete icon
    ↓
Confirmation dialog
    ↓
adminFetch() - DELETE to backend
    ↓
removeVariationImage() - Remove from DB
    ↓
deleteFile() - Remove from Cloudinary
    ↓
Response with updated variation
    ↓
onImagesChange() - Update parent state
    ↓
Gallery re-renders without deleted image
```

---

## Component Hierarchy

```
ProductVariantManager
├── GenerateFromAttributes
└── SimpleVariantRow (for each variation)
    ├── Variant attributes display
    ├── Action buttons (Save, Delete, Expand)
    └── Expanded content (when expanded)
        ├── "Manage Images" button
        ├── "Manage City Pricing" button
        ├── VariationImageUpload (conditional)
        │   ├── Upload zone
        │   └── Image gallery
        └── ProductCityConfig (conditional)
```

---

## State Management

### ProductVariantManager State
```typescript
const [savingId, setSavingId] = useState<string | null>(null);
const [draftConfigs, setDraftConfigs] = useState<Record<string, CityConfig[]>>({});
```

### SimpleVariantRow State
```typescript
const [expanded, setExpanded] = useState(false);
const [showCityPricing, setShowCityPricing] = useState(false);
const [showImages, setShowImages] = useState(false);  // ← NEW
```

### VariationImageUpload State
```typescript
const [uploading, setUploading] = useState(false);
const [dragOver, setDragOver] = useState(false);
const [error, setError] = useState<string | null>(null);
```

---

## API Contract

### Request: Upload Images
```
POST /api/v1/products/{productId}/variations/{variationId}/images
Content-Type: application/json

{
  "images": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "products/variations/..."
    }
  ]
}
```

### Response: Upload Success
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Images added.",
  "data": {
    "_id": "...",
    "product": "...",
    "attributes": {...},
    "images": [
      {
        "_id": "...",
        "url": "https://...",
        "publicId": "..."
      }
    ]
  }
}
```

### Request: Delete Image
```
DELETE /api/v1/products/{productId}/variations/{variationId}/images/{imageId}
```

### Response: Delete Success
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Image removed.",
  "data": {
    "_id": "...",
    "images": [...]
  }
}
```

---

## Error Handling

### Backend Errors
- `404 Variation not found` - Invalid variation ID
- `400 images array is required` - Missing images in request
- Cloudinary errors caught and logged

### Frontend Errors
- Upload failures show error message
- Delete failures show alert
- Network errors handled gracefully
- Loading states prevent double-submit

---

## Performance Considerations

✅ **Optimized:**
- Images uploaded directly to Cloudinary (not through Node)
- Lazy loading of images in gallery
- Memoized displayImages calculation
- Conditional rendering of upload panel

⚠️ **Potential Improvements:**
- Image compression before upload
- Batch upload for multiple variations
- Caching of image URLs
- Progressive image loading

---

## Testing Scenarios

### Unit Tests Needed
- `addVariationImages()` - Valid/invalid inputs
- `removeVariationImage()` - Image deletion
- `VariationImageUpload` - Upload/delete flows
- `displayImages` useMemo - Fallback logic

### Integration Tests Needed
- Upload → Display flow
- Delete → Gallery update flow
- Variation switch → Image update
- Product edit → Images persist

### E2E Tests Needed
- Admin uploads variation image
- Customer sees image on storefront
- Image switches when variation changes
- Fallback works when no variation image

---

## Deployment Checklist

- [ ] Backend routes added
- [ ] Backend handlers implemented
- [ ] Frontend component created
- [ ] ProductVariantManager updated
- [ ] Cloudinary credentials verified
- [ ] Database migrations (if any)
- [ ] Environment variables set
- [ ] Tests passing
- [ ] Code review completed
- [ ] Documentation updated
