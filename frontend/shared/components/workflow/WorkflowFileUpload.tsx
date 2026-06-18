import { useId, useRef, useState } from "react";
import { FileText, ImageIcon, Upload, X } from "lucide-react";

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
    <div className="wf-file-preview">
      {files.map((f, i) => {
        const name = f.label || f.name || `File ${i + 1}`;
        const isImg = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(f.url);
        return (
          <a
            key={`${f.url}-${i}`}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="wf-file-preview__card"
          >
            <div className="wf-file-preview__thumb">
              {isImg ? (
                <img src={f.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{name}</p>
              <p className="text-xs font-semibold text-[#E85A00]">View / download</p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
