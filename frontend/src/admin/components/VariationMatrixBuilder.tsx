/**
 * VariationMatrixBuilder
 * Step 1 – define axes (add attribute keys + values)
 * Step 2 – preview total variant count
 * Step 3 – generate all combinations in one click
 * Color axis gets name+hex input with live swatch preview.
 */
import { useState, useMemo } from "react";
import { Plus, Trash2, Loader2, Zap, AlertTriangle } from "lucide-react";
import { adminFetch as apiFetch } from "../../lib/adminApi";

const WARN_THRESHOLD = 50;
const HARD_LIMIT = 500;

export type ColorValue = { value: string; colorCode: string };
export type AxisValue = string | ColorValue;

export type AxisDef = {
  key: string;
  values: AxisValue[];
};

type Props = {
  productId: string;
  onGenerated: (newVariations: any[]) => void;
};

const inp =
  "w-full bg-white border border-sb-ink/15 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange/20 transition-colors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isColorAxis(key: string) {
  return key.trim().toLowerCase() === "color";
}

function isValidColor(code: string): boolean {
  if (!code.trim()) return false;
  const s = new Option().style;
  s.color = code.trim();
  return !!s.color;
}

// ---------------------------------------------------------------------------
// ColorValueInput — a single color entry row
// ---------------------------------------------------------------------------
function ColorValueInput({
  cv,
  onChange,
  onRemove,
  canRemove,
}: {
  cv: ColorValue;
  onChange: (next: ColorValue) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const valid = isValidColor(cv.colorCode || cv.value);
  const displayColor = cv.colorCode || (isValidColor(cv.value) ? cv.value : "");

  return (
    <div className="flex items-center gap-2">
      {/* Swatch */}
      <span
        className="w-7 h-7 rounded-full border border-sb-ink/20 flex-shrink-0"
        style={{ background: displayColor || "#e5e7eb" }}
        title={displayColor || "Enter a color code"}
      />
      <input
        className={`${inp} flex-1`}
        placeholder="Color name (e.g. Red)"
        value={cv.value}
        onChange={(e) => onChange({ ...cv, value: e.target.value })}
      />
      <input
        className={`${inp} w-32 font-mono text-xs ${cv.colorCode && !valid ? "border-red-400 ring-1 ring-red-300" : ""}`}
        placeholder="#FF0000"
        value={cv.colorCode}
        onChange={(e) => onChange({ ...cv, colorCode: e.target.value })}
      />
      {cv.colorCode && !valid && (
        <span className="text-xs text-red-500 shrink-0">Invalid</span>
      )}
      <button
        type="button"
        disabled={!canRemove}
        onClick={onRemove}
        className="p-1.5 text-sb-ink/40 hover:text-red-500 disabled:opacity-30"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AxisRow — one attribute axis (key + values)
// ---------------------------------------------------------------------------
function AxisRow({
  axis,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  axis: AxisDef;
  index: number;
  onChange: (next: AxisDef) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const isColor = isColorAxis(axis.key);

  const addValue = () => {
    if (isColor) {
      onChange({ ...axis, values: [...axis.values, { value: "", colorCode: "" } as ColorValue] });
    } else {
      onChange({ ...axis, values: [...axis.values, ""] });
    }
  };

  const updateValue = (i: number, v: AxisValue) => {
    const next = [...axis.values];
    next[i] = v;
    onChange({ ...axis, values: next });
  };

  const removeValue = (i: number) => {
    onChange({ ...axis, values: axis.values.filter((_, j) => j !== i) });
  };

  const onKeyChange = (newKey: string) => {
    const wasColor = isColorAxis(axis.key);
    const willBeColor = isColorAxis(newKey);
    if (wasColor !== willBeColor) {
      onChange({
        key: newKey,
        values: willBeColor ? [{ value: "", colorCode: "" }] : [""],
      });
    } else {
      onChange({ ...axis, key: newKey });
    }
  };

  return (
    <div className="border border-sb-ink/10 rounded-xl p-4 space-y-3 bg-sb-cream-secondary">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-sb-ink/50 mb-1 block font-medium">
            Attribute name
          </label>
          <input
            className={inp}
            placeholder="e.g. Size, Color, Diameter, Weight…"
            value={axis.key}
            onChange={(e) => onKeyChange(e.target.value)}
            list={`axis-suggestions-${index}`}
          />
          <datalist id={`axis-suggestions-${index}`}>
            {["Color", "Size", "Weight", "Diameter", "Length", "Thickness", "Grade", "Finish", "Pack Size", "Capacity", "Material"].map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </div>
        <button
          type="button"
          disabled={!canRemove}
          onClick={onRemove}
          className="mt-5 p-2 text-sb-ink/40 hover:text-red-500 disabled:opacity-30 shrink-0"
          title="Remove attribute"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-sb-ink/50 font-medium block">Values</label>
        {axis.values.map((val, i) =>
          isColor ? (
            <ColorValueInput
              key={i}
              cv={val as ColorValue}
              onChange={(cv) => updateValue(i, cv)}
              onRemove={() => removeValue(i)}
              canRemove={axis.values.length > 1}
            />
          ) : (
            <div key={i} className="flex gap-2 items-center">
              <input
                className={`${inp} flex-1`}
                placeholder={`Value ${i + 1}`}
                value={val as string}
                onChange={(e) => updateValue(i, e.target.value)}
              />
              <button
                type="button"
                disabled={axis.values.length <= 1}
                onClick={() => removeValue(i)}
                className="p-1.5 text-sb-ink/40 hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        )}
        <button
          type="button"
          onClick={addValue}
          className="flex items-center gap-1.5 text-xs text-sb-orange font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          {isColor ? "Add color" : "Add value"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VariationMatrixBuilder
// ---------------------------------------------------------------------------
export function VariationMatrixBuilder({ productId, onGenerated }: Props) {
  const [axes, setAxes] = useState<AxisDef[]>([{ key: "", values: [""] }]);
  const [generating, setGenerating] = useState(false);

  const totalCount = useMemo(() => {
    const validAxes = axes.filter(
      (a) =>
        a.key.trim() &&
        a.values.some((v) =>
          typeof v === "string" ? v.trim() : v.value.trim()
        )
    );
    if (!validAxes.length) return 0;
    return validAxes.reduce((acc, a) => {
      const count = a.values.filter((v) =>
        typeof v === "string" ? v.trim() : v.value.trim()
      ).length;
      return acc * count;
    }, 1);
  }, [axes]);

  const addAxis = () =>
    setAxes((prev) => [...prev, { key: "", values: [""] }]);

  const updateAxis = (i: number, next: AxisDef) =>
    setAxes((prev) => prev.map((a, j) => (j === i ? next : a)));

  const removeAxis = (i: number) =>
    setAxes((prev) => prev.filter((_, j) => j !== i));

  const generate = async () => {
    const validAxes = axes
      .filter(
        (a) =>
          a.key.trim() &&
          a.values.some((v) =>
            typeof v === "string" ? v.trim() : v.value.trim()
          )
      )
      .map((a) => ({
        key: a.key.trim(),
        values: a.values
          .filter((v) =>
            typeof v === "string" ? v.trim() : v.value.trim()
          )
          .map((v) =>
            typeof v === "string"
              ? { value: v.trim(), colorCode: null }
              : { value: v.value.trim(), colorCode: v.colorCode?.trim() || null }
          ),
      }));

    if (!validAxes.length) return alert("Add at least one attribute with values.");
    if (totalCount > HARD_LIMIT) return alert(`This will create ${totalCount} variants (max ${HARD_LIMIT}). Reduce values.`);
    if (totalCount >= WARN_THRESHOLD) {
      if (!window.confirm(`This will create ${totalCount} variants. Continue?`)) return;
    }

    setGenerating(true);
    try {
      const res = await apiFetch(`/products/${productId}/variations/generate-matrix`, {
        method: "POST",
        body: JSON.stringify({ axes: validAxes }),
      });
      onGenerated(res.data?.created || []);
      setAxes([{ key: "", values: [""] }]);
    } catch (e: any) {
      alert(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border border-sb-orange/20 rounded-xl p-5 space-y-4 bg-[#FFFBF7]">
      <div>
        <p className="text-sm font-semibold text-sb-ink">Generate Variants</p>
        <p className="text-xs text-sb-ink/50 mt-0.5">
          Define attributes and values — system auto-generates all combinations.
        </p>
      </div>

      <div className="space-y-3">
        {axes.map((axis, i) => (
          <AxisRow
            key={i}
            index={i}
            axis={axis}
            onChange={(next) => updateAxis(i, next)}
            onRemove={() => removeAxis(i)}
            canRemove={axes.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addAxis}
        className="flex items-center gap-1.5 text-sm text-sb-orange font-medium"
      >
        <Plus className="w-4 h-4" /> Add attribute
      </button>

      {totalCount > 0 && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
          totalCount >= WARN_THRESHOLD
            ? "bg-amber-50 border border-amber-200 text-amber-800"
            : "bg-sb-orange/8 border border-sb-orange/20 text-sb-orange"
        }`}>
          {totalCount >= WARN_THRESHOLD && <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>
            Total variants to be created: <strong>{totalCount}</strong>
            {totalCount > HARD_LIMIT && ` — exceeds limit of ${HARD_LIMIT}`}
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={generating || totalCount === 0 || totalCount > HARD_LIMIT}
        onClick={() => void generate()}
        className="flex items-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors"
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {generating ? "Generating…" : "Generate Variants"}
      </button>
    </div>
  );
}
