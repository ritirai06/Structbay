import { useId, useRef, useState } from "react";
import { FileText, File as FileIcon, Upload, X, Eye, Download } from "lucide-react";

type Props = {
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  name?: string;
  disabled?: boolean;
  onChange?: (files: File[]) => void;
  className?: string;
};

function isImage(file: File) {
  return file.type.startsWith("image/");
}

export function WorkflowFileUpload({
  label,
  hint,
  accept = ".pdf,image/*",
  multiple = false,
  required,
  name,
  disabled,
  onChange,
  className = "",
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const setSelected = (list: File[]) => {
    const next = multiple ? list : list.slice(0, 1);
    setFiles(next);
    onChange?.(next);
    
    // Sync to native DOM element for FormData and querySelector compatibility
    if (inputRef.current) {
      try {
        const dt = new DataTransfer();
        next.forEach((f) => dt.items.add(f));
        inputRef.current.files = dt.files;
      } catch (e) {
        // Fallback for extremely old browsers where DataTransfer isn't supported
      }
    }
  };

  const onPick = (list: FileList | null) => {
    if (!list?.length) return;
    setSelected(Array.from(list));
  };

  return (
    <div className={`wf-file-upload ${className}`.trim()}>
      <label htmlFor={id} className="wf-file-upload__label">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {hint ? <p className="wf-file-upload__hint">{hint}</p> : null}

      <div
        className={`wf-file-upload__zone${dragOver ? " wf-file-upload__zone--active" : ""}${disabled ? " wf-file-upload__zone--disabled" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) onPick(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        <Upload className="wf-file-upload__icon" aria-hidden />
        <p className="wf-file-upload__cta">
          <span className="font-semibold text-[#E85A00]">Click to upload</span> or drag & drop
        </p>
        <p className="wf-file-upload__types">PDF or images · max recommended 10 MB each</p>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          required={required && files.length === 0}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => onPick(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="wf-file-upload__list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="wf-file-upload__item">
              <div className="wf-file-upload__thumb">
                {isImage(f) ? (
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FileText className="w-5 h-5 text-[#E85A00]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{f.name}</p>
                <p className="text-xs text-gray-500">{(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                className="wf-file-upload__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = files.filter((_, j) => j !== i);
                  setSelected(next);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WorkflowFilePreview({
  files,
}: {
  files: Array<{ url: string; name?: string; label?: string }>;
}) {
  if (!files.length) return null;

  return (
    <div className="wf-file-preview space-y-2">
      {files.map((f, i) => {
        const name = f.label || f.name || `File ${i + 1}`;
        let finalUrl = f.url;
        let ext = "";
        const urlMatch = finalUrl.match(/\.([a-zA-Z0-9]+)(?:[\?#]|$)/);
        if (urlMatch) ext = urlMatch[1].toLowerCase();

        // If URL has no extension, try to infer from the file name or label
        if (!ext && name) {
          const nameMatch = name.match(/\.([a-zA-Z0-9]+)$/);
          if (nameMatch) ext = nameMatch[1].toLowerCase();
        }

        const isImg = ["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext);

        // We should NOT append an extension to the Cloudinary URL.
        // Cloudinary raw files will throw 404 if we alter the URL extension.
        // And image resources will serve correctly from their original secure_url.
        
        let downloadUrl = finalUrl;
        // Just use the finalUrl for download, relying on target="_blank" and download attribute.
        // We removed fl_attachment because it can cause Cloudinary to reject the request if the file was uploaded as raw.

        return (
          <div
            key={`${f.url}-${i}`}
            className="wf-file-preview__card"
          >
            <div className="wf-file-preview__thumb">
              {isImg ? (
                <img src={finalUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <FileText className="w-6 h-6 text-gray-400 m-auto mt-2" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{name}</p>
              <div className="flex gap-4 mt-1.5">
                <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-[11px] font-semibold text-blue-600 hover:underline">
                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                </a>
                <a href={downloadUrl} download target="_blank" rel="noopener noreferrer" className="flex items-center text-[11px] font-semibold text-[#E85A00] hover:underline">
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
