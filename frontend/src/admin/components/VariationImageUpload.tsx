import { useRef, useState } from "react";
import { Upload, X, Loader2, Trash2 } from "lucide-react";
import { adminFetch } from "../../lib/adminApi";

type ImageData = {
  _id?: string;
  url: string;
  publicId: string;
};

type Props = {
  productId: string;
  variationId: string;
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  disabled?: boolean;
};

export function VariationImageUpload({
  productId,
  variationId,
  images,
  onImagesChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res: any = await adminFetch(
        `/products/${productId}/variations/${variationId}/images`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.data?.images) {
        onImagesChange(res.data.images);
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!window.confirm("Delete this image?")) return;

    try {
      const res: any = await adminFetch(
        `/products/${productId}/variations/${variationId}/images/${imageId}`,
        { method: "DELETE" }
      );
      if (res.data?.images) {
        onImagesChange(res.data.images);
      }
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragOver
            ? "border-sb-orange bg-sb-orange/5"
            : "border-sb-ink/15 hover:border-sb-ink/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || uploading}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="text-center">
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-sb-orange mx-auto mb-2 animate-spin" />
              <p className="text-sm font-medium text-sb-ink">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-sb-ink/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-sb-ink">
                <span className="text-sb-orange">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-sb-ink/50 mt-1">PNG, JPG, GIF up to 10MB</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div
              key={img._id || img.url}
              className="relative group rounded-lg overflow-hidden border border-sb-ink/10 bg-gray-50"
            >
              <img
                src={img.url}
                alt="Variation"
                className="w-full h-24 object-cover"
              />
              <button
                type="button"
                onClick={() => deleteImage(img._id || img.url)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                title="Delete image"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
