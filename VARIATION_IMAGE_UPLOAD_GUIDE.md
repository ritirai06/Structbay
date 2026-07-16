# Variation Image Upload - Quick Start Guide

## For Admins

### Uploading Images to a Variation

1. **Navigate to Product Edit**
   - Go to Admin → Products → Edit Product
   - Scroll to the "Product Variants" section

2. **Expand a Variation**
   - Click the chevron (▼) on the right side of any variation card
   - The card expands to show additional options

3. **Upload Images**
   - Click the **"Manage Images"** button
   - An image upload panel appears
   - Either:
     - **Drag & drop** images onto the upload zone
     - **Click** the upload zone to open file picker
   - Select PNG, JPG, or GIF files (max 10MB each)

4. **Preview & Delete**
   - Uploaded images appear in a grid below
   - Hover over an image to see the delete button
   - Click the trash icon to delete (with confirmation)

5. **Save**
   - Images are saved automatically to Cloudinary
   - No additional save button needed

### Example Workflow

```
Product: T-Shirt
├── Variation: Red / Small
│   └── Images: red-small-1.jpg, red-small-2.jpg
├── Variation: Red / Medium
│   └── Images: red-medium-1.jpg
├── Variation: Blue / Small
│   └── Images: blue-small-1.jpg, blue-small-2.jpg
└── Variation: Blue / Medium
    └── Images: (none - will use product image)
```

## For Customers

### Viewing Variation Images

1. **Browse Product**
   - Customer views a product with variants
   - Main image gallery shows product images

2. **Select a Variation**
   - Click on a variation option (e.g., "Red", "Medium")
   - Main image automatically updates to show variation image
   - If no variation image exists, shows product image

3. **Browse Images**
   - Click thumbnails to view different images
   - All variation images appear in the gallery

### Example Experience

```
Customer selects: Color = Red, Size = Medium

Before: Main image shows generic T-shirt
After: Main image shows red T-shirt in medium size
       (if admin uploaded variation-specific image)
```

## Technical Details

### Image Storage
- Images stored in Cloudinary under `products/variations/` folder
- Each image has:
  - `url`: Cloudinary secure URL
  - `publicId`: Cloudinary public ID (for deletion)

### Fallback Logic
```
Display Image Priority:
1. Variation-specific image (if exists)
2. Product image (fallback)
```

### API Calls
- Upload: `POST /api/v1/products/{id}/variations/{varId}/images`
- Delete: `DELETE /api/v1/products/{id}/variations/{varId}/images/{imageId}`

## Troubleshooting

### Images Not Showing
- Check that variation images were uploaded successfully
- Verify Cloudinary credentials in backend `.env`
- Check browser console for errors

### Upload Fails
- Ensure file size < 10MB
- Check file format (PNG, JPG, GIF)
- Verify internet connection
- Check Cloudinary API limits

### Images Deleted from Cloudinary
- Deletion is automatic when removing from variation
- Check Cloudinary dashboard to verify
- Images are permanently deleted (no recovery)

## Best Practices

✅ **Do:**
- Upload high-quality images (at least 500x500px)
- Use consistent image dimensions across variations
- Upload multiple angles for each variation
- Test on mobile before publishing

❌ **Don't:**
- Upload very large files (>10MB)
- Use low-resolution images
- Mix different aspect ratios
- Delete images without backup

## Keyboard Shortcuts

- **Tab**: Navigate between variations
- **Enter**: Expand/collapse variation
- **Space**: Toggle image upload panel
- **Delete**: Remove selected image (with confirmation)

## Support

For issues or questions:
- Check the implementation guide: `VARIATION_IMAGE_UPLOAD_IMPLEMENTATION.md`
- Review API documentation in backend README
- Check Cloudinary dashboard for upload status
