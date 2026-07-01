import React, { useState } from "react";
import { Plus, Trash2, CheckSquare, Square, X } from "lucide-react";

export type ProductAttribute = {
  name: string;
  values: string[];
  visibleOnProductPage: boolean;
  usedForVariants: boolean;
};

type Props = {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
};

const inp = "w-full bg-white border border-sb-ink/15 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange/20 transition-colors";

function ChipInput({
  values,
  onChange,
  placeholder = "Type and press Enter",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "|") {
      e.preventDefault();
      addChip(inputValue);
    } else if (e.key === "Backspace" && !inputValue && values.length > 0) {
      removeChip(values.length - 1);
    }
  };

  const addChip = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    
    // Check for duplicates
    if (!values.find((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...values, trimmed]);
    }
    setInputValue("");
  };

  const handleBlur = () => {
    addChip(inputValue);
  };

  const removeChip = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 w-full bg-white border border-sb-ink/15 rounded-lg px-3 py-2 text-sm text-sb-ink focus-within:border-sb-orange focus-within:ring-1 focus-within:ring-sb-orange/20 transition-colors min-h-[42px]`}>
      {values.map((v, i) => (
        <span key={i} className="flex items-center gap-1 bg-sb-orange/10 text-sb-orange font-medium px-2.5 py-1 rounded-md text-sm">
          {v}
          <button type="button" onClick={() => removeChip(i)} className="text-sb-orange hover:text-sb-orange-hover focus:outline-none">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="flex-1 min-w-[120px] bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-sm placeholder:text-sb-ink/40"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={values.length === 0 ? placeholder : ""}
      />
    </div>
  );
}

export function ProductAttributesManager({ attributes, onChange }: Props) {
  const [newAttrName, setNewAttrName] = useState("");

  const addAttribute = () => {
    const name = newAttrName.trim();
    if (!name) return;
    if (attributes.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      alert("Attribute already exists");
      return;
    }
    onChange([
      ...attributes,
      { name, values: [], visibleOnProductPage: true, usedForVariants: true },
    ]);
    setNewAttrName("");
  };

  const updateAttribute = (index: number, patch: Partial<ProductAttribute>) => {
    const next = [...attributes];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeAttribute = (index: number) => {
    onChange(attributes.filter((_, i) => i !== index));
  };

  const handleValuesChange = (index: number, rawValues: string[]) => {
    updateAttribute(index, { values: rawValues });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-sb-ink/50">
        Define attributes like Size, Color, or Material. Press Enter, Comma, or Pipe (|) to add multiple values.
      </p>

      <div className="space-y-4">
        {attributes.map((attr, i) => (
          <div key={i} className="border border-sb-ink/10 rounded-xl p-4 bg-sb-cream-secondary space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <input
                  className={`${inp} font-semibold`}
                  value={attr.name}
                  onChange={(e) => updateAttribute(i, { name: e.target.value })}
                  placeholder="Attribute name"
                />
              </div>
              <button
                type="button"
                onClick={() => removeAttribute(i)}
                className="p-2 text-sb-ink/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-sb-ink/50 mb-1 block font-medium">Values (Press Enter to add)</label>
              <ChipInput
                values={attr.values}
                onChange={(newValues) => handleValuesChange(i, newValues)}
                placeholder="e.g. Small, Medium, Large"
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-sb-ink/80">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={attr.visibleOnProductPage}
                  onChange={(e) => updateAttribute(i, { visibleOnProductPage: e.target.checked })}
                />
                {attr.visibleOnProductPage ? (
                  <CheckSquare className="w-4 h-4 text-sb-orange" />
                ) : (
                  <Square className="w-4 h-4 text-sb-ink/40" />
                )}
                Visible on product page (Specifications)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-sb-ink/80">
                <input
                  type="checkbox"
                  className="hidden"
                  checked={attr.usedForVariants}
                  onChange={(e) => updateAttribute(i, { usedForVariants: e.target.checked })}
                />
                {attr.usedForVariants ? (
                  <CheckSquare className="w-4 h-4 text-sb-orange" />
                ) : (
                  <Square className="w-4 h-4 text-sb-ink/40" />
                )}
                Used for variants
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white border border-sb-ink/10 p-2 rounded-lg w-fit">
        <input
          className="bg-transparent border-none text-sm px-2 py-1 w-48 focus:outline-none placeholder:text-sb-ink/40"
          placeholder="New attribute name"
          value={newAttrName}
          onChange={(e) => setNewAttrName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttribute())}
        />
        <button
          type="button"
          onClick={addAttribute}
          disabled={!newAttrName.trim()}
          className="bg-sb-orange text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-sb-orange-hover disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
