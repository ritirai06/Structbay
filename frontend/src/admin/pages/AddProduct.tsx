import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams, Link, useLocation } from "react-router";
import { ArrowLeft, Plus, Trash2, Loader2, Save, Shield, Zap, TrendingUp, Star, Info, Upload, RefreshCw } from "lucide-react";
import { adminPath } from "../../lib/portalRoutes";
import { adminFetch as apiFetch, adminUploadImage, getAdminToken } from "../../lib/adminApi";
import { AdminDeleteConfirmModal } from "../components/AdminDeleteConfirmModal";
import { useAdminDeleteFlow } from "../hooks/useAdminDeleteFlow";
import { ProductCityConfig } from "../components/ProductCityConfig";
import { ProductVariantManager } from "../components/ProductVariantManager";
import { ProductRelationshipManager } from "../components/ProductRelationshipManager";
import {
  type ActiveCity,
  type CityConfig,
  buildCityConfigsFromApi,
  cityConfigsToPayload,
  validateCityConfigs,
} from "../lib/productCityConfig";

const emptyReturnExchangePolicy = {
  return: {
    allowed: false,
    windowDays: "" as number | "",
    instructions: "",
    conditions: [] as string[],
    nonReturnableConditions: [] as string[],
  },
  exchange: {
    allowed: false,
    windowDays: "" as number | "",
    instructions: "",
    conditions: [] as string[],
  },
};

const emptyForm = {
  name: "", sku: "", category: "", brand: "",
  shortDescription: "", description: "",
  gstPercentage: 18, priceIncludesGst: false, status: "DRAFT",
  deliveryType: "vendor_delivery" as "vendor_delivery" | "structbay_delivery",
  productStructure: "simple" as "simple" | "variant",
  isFeatured: false, isTopSelling: false, isAssured: false, isExpress: false,
  displayOrder: 0,
  seo: { metaTitle: "", metaDescription: "", metaKeywords: [] },
  faqs: [] as { question: string; answer: string }[],
  returnExchangePolicy: emptyReturnExchangePolicy,
  videos: [] as { title: string; url: string }[],
  documents: [] as { name: string; url: string }[],
};

function normalizeReturnExchangePolicy(raw: unknown) {
  const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const ret = p.return && typeof p.return === "object" ? (p.return as Record<string, unknown>) : {};
  const ex = p.exchange && typeof p.exchange === "object" ? (p.exchange as Record<string, unknown>) : {};
  return {
    return: {
      allowed: !!ret.allowed,
      windowDays: ret.windowDays != null && ret.windowDays !== "" ? Number(ret.windowDays) : "",
      instructions: String(ret.instructions || ""),
      conditions: Array.isArray(ret.conditions) ? ret.conditions.map(String).filter(Boolean) : [],
      nonReturnableConditions: Array.isArray(ret.nonReturnableConditions)
        ? ret.nonReturnableConditions.map(String).filter(Boolean)
        : [],
    },
    exchange: {
      allowed: !!ex.allowed,
      windowDays: ex.windowDays != null && ex.windowDays !== "" ? Number(ex.windowDays) : "",
      instructions: String(ex.instructions || ""),
      conditions: Array.isArray(ex.conditions) ? ex.conditions.map(String).filter(Boolean) : [],
    },
  };
}

function serializeReturnExchangePolicy(policy: typeof emptyReturnExchangePolicy) {
  return {
    return: {
      allowed: policy.return.allowed,
      windowDays: policy.return.windowDays !== "" ? Number(policy.return.windowDays) : null,
      instructions: policy.return.instructions.trim(),
      conditions: policy.return.conditions.map((c) => c.trim()).filter(Boolean),
      nonReturnableConditions: policy.return.nonReturnableConditions.map((c) => c.trim()).filter(Boolean),
    },
    exchange: {
      allowed: policy.exchange.allowed,
      windowDays: policy.exchange.windowDays !== "" ? Number(policy.exchange.windowDays) : null,
      instructions: policy.exchange.instructions.trim(),
      conditions: policy.exchange.conditions.map((c) => c.trim()).filter(Boolean),
    },
  };
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-[#000000] mb-1.5 block font-semibold">
        {label}{required && <span className="text-sb-ink/55 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = "w-full bg-sb-cream-secondary border border-sb-ink/10 rounded-lg px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/40 focus:outline-none focus:border-sb-orange focus:ring-1 focus:ring-sb-orange/20 transition-colors";
const sel = `${inp} cursor-pointer`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-sb-ink/10">
        <h3 className="font-semibold text-[#000000] text-base tracking-tight">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, icon: Icon }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; icon: any;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        checked
          ? "border-[#FB923C] bg-[#FFF7ED]"
          : "border-[#E5E7EB] bg-white"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          checked ? "bg-[#FFEDD5]" : "bg-[#F9FAFB]"
        }`}
      >
        <Icon className={`w-4 h-4 ${checked ? "text-[#EA580C]" : "text-[#6B7280]"}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${checked ? "text-[#EA580C]" : "text-[#374151]"}`}>{label}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
          checked ? "bg-sb-orange" : "bg-[#D1D5DB]"
        }`}
      >
        <span
          className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function PolicyStringList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <label className="text-xs text-[#374151] font-medium mb-2 block">{label}</label>
      {items.length > 0 && (
        <ul className="space-y-2 mb-3">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E5E7EB] bg-white">
              <span className="flex-1 text-sm text-[#374151]">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="p-1.5 text-[#6B7280] hover:text-red-600 rounded"
                aria-label="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          className={inp}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = draft.trim();
              if (!v) return;
              onChange([...items, v]);
              setDraft("");
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            const v = draft.trim();
            if (!v) return;
            onChange([...items, v]);
            setDraft("");
          }}
          className="shrink-0 px-3 py-2 rounded-lg border border-sb-orange/30 text-sb-orange text-sm font-medium hover:bg-sb-orange/5"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function AddProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyForm);
  const [variations, setVariations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [tab, setTab] = useState<"info" | "cities" | "media" | "variations" | "seo" | "faqs" | "policy" | "relationships">("info");
  const [activeCities, setActiveCities] = useState<ActiveCity[]>([]);
  const [cityConfigs, setCityConfigs] = useState<CityConfig[]>([]);
  const [dirty, setDirty] = useState(false);
  const initialSnapshot = useRef<string>("");
  const [images, setImages] = useState<{ _id?: string; url: string; publicId?: string }[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [mediaMsg, setMediaMsg] = useState<null | { type: "ok" | "err"; text: string }>(null);
  const [catalogCategories, setCatalogCategories] = useState<{ _id: string; name: string }[]>([]);
  /** `categoryId` = brand's linked category (Brands admin); null = legacy / any category */
  const [catalogBrands, setCatalogBrands] = useState<{ _id: string; name: string; categoryId: string | null }[]>([]);
  const imageDelete = useAdminDeleteFlow();
  // Upsell & Cross-Sell relationships
  const [upsellProducts, setUpsellProducts] = useState<any[]>([]);
  const [crossSellProducts, setCrossSellProducts] = useState<any[]>([]);

  useEffect(() => {
    const tabFromState = (location.state as { tab?: string } | null)?.tab;
    const allowed = ["info", "cities", "media", "variations", "seo", "faqs", "policy", "relationships"] as const;
    if (tabFromState && (allowed as readonly string[]).includes(tabFromState)) {
      setTab(tabFromState as typeof tab);
    }
  }, [location.state]);

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingPreviews]);

  const uploadFilesToProduct = async (productId: string, files: File[]) => {
    const uploaded: { url: string; publicId: string }[] = [];
    for (const file of files) {
      const { url, publicId } = await adminUploadImage("/upload/product-image", file);
      uploaded.push({ url, publicId });
    }
    const res = await apiFetch(`/products/${productId}/images`, {
      method: "POST",
      body: JSON.stringify({ images: uploaded }),
    });
    const product = res.data as { images?: typeof images } | undefined;
    return product?.images || [];
  };

  useEffect(() => {
    apiFetch("/categories?limit=200&status=ACTIVE")
      .then(d => setCatalogCategories((d.data || []).map((c: { _id: string; name: string }) => ({ _id: c._id, name: c.name }))))
      .catch(() => setCatalogCategories([]));
    apiFetch("/brands?limit=200&status=ACTIVE")
      .then(d =>
        setCatalogBrands(
          (d.data || []).map((b: { _id: string; name: string; category?: { _id: string } | string | null }) => ({
            _id: b._id,
            name: b.name,
            categoryId: b.category && typeof b.category === "object" && "_id" in b.category ? b.category._id : (b.category as string) || null,
          }))
        )
      )
      .catch(() => setCatalogBrands([]));
  }, []);

  /** Brands linked to the selected category, plus legacy brands with no category set */
  const brandsForCategory = useMemo(() => {
    if (!form.category) return catalogBrands;
    return catalogBrands.filter(
      b => !b.categoryId || String(b.categoryId) === String(form.category)
    );
  }, [catalogBrands, form.category]);

  const brandSelectOptions = useMemo(() => {
    const list = [...brandsForCategory].sort((a, b) => a.name.localeCompare(b.name));
    if (form.brand && !list.some(b => String(b._id) === String(form.brand))) {
      const current = catalogBrands.find(b => String(b._id) === String(form.brand));
      if (current) return [current, ...list];
    }
    return list;
  }, [brandsForCategory, form.brand, catalogBrands]);

  useEffect(() => {
    if (!form.category || !form.brand || catalogBrands.length === 0) return;
    const allowed = brandsForCategory.some(b => String(b._id) === String(form.brand));
    if (!allowed) set("brand", "");
  }, [form.category, form.brand, brandsForCategory, catalogBrands.length]);

  useEffect(() => {
    apiFetch("/cities?limit=200&status=ACTIVE")
      .then((d) => {
        const cities = (d.data || [])
          .filter((c: { isServiceable?: boolean }) => c.isServiceable !== false)
          .map((c: { _id: string; name: string; slug?: string }) => ({
            _id: c._id,
            name: c.name,
            slug: c.slug,
          }));
        setActiveCities(cities);
      })
      .catch(() => setActiveCities([]));
  }, []);

  useEffect(() => {
    if (isEdit || !activeCities.length || cityConfigs.length) return;
    setCityConfigs(buildCityConfigsFromApi(activeCities, [], form.gstPercentage));
  }, [isEdit, activeCities, cityConfigs.length, form.gstPercentage]);

  const snapshotState = useCallback(
    () => JSON.stringify({ form, cityConfigs }),
    [form, cityConfigs]
  );

  useEffect(() => {
    if (!initialSnapshot.current && !loading && (isEdit || activeCities.length)) {
      initialSnapshot.current = snapshotState();
    }
  }, [loading, isEdit, activeCities.length, snapshotState]);

  useEffect(() => {
    if (!initialSnapshot.current) return;
    setDirty(snapshotState() !== initialSnapshot.current);
  }, [snapshotState]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Product recommendations now loaded from main product API

  useEffect(() => {
    if (!isEdit) return;
    apiFetch(`/products/${id}`)
      .then(d => {
        const p = d.data;
        // Debug log for GET Product response
        console.log("DEBUG: GET Product", p);
        // Debug log for frontend state initialization
        console.log("DEBUG: Frontend State Initialization", {
          form: {
            name: p.name, sku: p.sku, category: p.category?._id || p.category,
            brand: p.brand?._id || p.brand, shortDescription: p.shortDescription || "",
            description: p.description || "", gstPercentage: p.gstPercentage,
            priceIncludesGst: !!p.priceIncludesGst,
            deliveryType: p.deliveryType === "structbay_delivery" || p.isStructbayDelivery || p.isExpress
              ? "structbay_delivery"
              : "vendor_delivery",
            productStructure:
              p.productStructure === "variant" || (p.variations?.length > 0)
                ? "variant"
                : "simple",
            status: p.status, isFeatured: p.isFeatured, isTopSelling: p.isTopSelling,
            isAssured: p.isAssured, isExpress: p.isExpress, displayOrder: p.displayOrder,
            seo: p.seo || { metaTitle: "", metaDescription: "", metaKeywords: [] },
            faqs: p.faqs || [], videos: p.videos || [], documents: p.documents || [],
            returnExchangePolicy: normalizeReturnExchangePolicy(p.returnExchangePolicy),
          },
          variations: p.variations || [],
          upsellProducts: p.upsellProducts || [],
          crossSellProducts: p.crossSellProducts || [],
        });
        setForm({
          name: p.name, sku: p.sku, category: p.category?._id || p.category,
          brand: p.brand?._id || p.brand, shortDescription: p.shortDescription || "",
          description: p.description || "", gstPercentage: p.gstPercentage,
          priceIncludesGst: !!p.priceIncludesGst,
          deliveryType: p.deliveryType === "structbay_delivery" || p.isStructbayDelivery || p.isExpress
            ? "structbay_delivery"
            : "vendor_delivery",
          productStructure:
            p.productStructure === "variant" || (p.variations?.length > 0)
              ? "variant"
              : "simple",
          status: p.status, isFeatured: p.isFeatured, isTopSelling: p.isTopSelling,
          isAssured: p.isAssured, isExpress: p.isExpress, displayOrder: p.displayOrder,
          seo: p.seo || { metaTitle: "", metaDescription: "", metaKeywords: [] },
          faqs: p.faqs || [], videos: p.videos || [], documents: p.documents || [],
          returnExchangePolicy: normalizeReturnExchangePolicy(p.returnExchangePolicy),
        });
        setVariations(p.variations || []);
        setUpsellProducts(p.upsellProducts || []);
        setCrossSellProducts(p.crossSellProducts || []);
        if (p._id) {
          apiFetch(`/products/${id}/variations`)
            .then((vr) => setVariations(vr.data || []))
            .catch(() => {});
        }
        setImages((p.images || []).map((img: { _id?: string; url: string; publicId?: string }) => ({
          _id: img._id, url: img.url, publicId: img.publicId,
        })));
        const cities = (p.activeCities || activeCities).map((c: ActiveCity) => ({
          _id: c._id,
          name: c.name,
          slug: c.slug,
        }));
        if (p.activeCities?.length) setActiveCities(p.activeCities);
        setCityConfigs(buildCityConfigsFromApi(cities.length ? cities : activeCities, p.cityConfigs, p.gstPercentage));
        initialSnapshot.current = "";
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const handleCityConfigsChange = (configs: CityConfig[]) => {
    setCityConfigs(configs);
    setDirty(true);
  };

  const goBack = () => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
    navigate(adminPath("products"));
  };

  const save = async (overrideStatus?: string) => {
    if (!form.name || !form.sku || !form.category || !form.brand) {
      return toast.warning("Name, SKU, category, and brand are required.");
    }
    if (!form.deliveryType) {
      return toast.warning("Delivery type is required.");
    }
    const isVariantProduct = form.productStructure === "variant";
    if (!isVariantProduct) {
      const validationError = validateCityConfigs(cityConfigs);
      if (validationError) return toast.warning(validationError);
    } else if (isEdit && variations.length === 0) {
      const proceed = window.confirm(
        "This is a Variant Product but no variants exist yet. Save anyway and add variants in the Variations tab?"
      );
      if (!proceed) return;
    }

    const publishStatus = overrideStatus ?? form.status;
    if (publishStatus === "ACTIVE") {
      if (!isVariantProduct) {
        const { cityPricing } = cityConfigsToPayload(cityConfigs);
        if (!cityPricing.length) {
          return toast.warning(
            "To publish on the storefront, set a selling price for at least one city (e.g. Bengaluru) in the Cities tab."
          );
        }
      } else if (isEdit && variations.length > 0) {
        const missingCity = variations.some((v) => {
          const configs = v.cityConfigs || [];
          return !configs.some(
            (c: { pricing?: { sellingPrice?: number } | null }) =>
              c.pricing?.sellingPrice != null && Number(c.pricing.sellingPrice) >= 0
          );
        });
        if (missingCity) {
          return toast.warning(
            "To publish a variant product, each variant needs city pricing. Open Variations → expand each variant → set Bengaluru price & stock → Save."
          );
        }
      }
    }

    // Debug logs before save
    console.log("DEBUG: Before Save", {
      variants: variations,
      cityConfigs,
      upsellProducts,
      crossSellProducts,
    });
    setSaving(true);
    try {
      const product = {
        ...form,
        isStructbayDelivery: form.deliveryType === "structbay_delivery",
        structbayDeliverySupported: form.deliveryType === "structbay_delivery",
        status: overrideStatus ?? form.status,
        documents: form.documents.filter(d => d.name.trim() && d.url.trim()),
        videos: form.videos.filter(v => v.title.trim() || v.url.trim()),
        returnExchangePolicy: serializeReturnExchangePolicy(form.returnExchangePolicy),
      };
      const body: Record<string, unknown> = { product };
      if (!isVariantProduct) {
        const { cityPricing, inventory } = cityConfigsToPayload(cityConfigs);
        body.cityPricing = cityPricing;
        body.inventory = inventory;
      }

      if (isEdit) {
        console.log("DEBUG: API Payload", body);
        await apiFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });
        setDirty(false);
        initialSnapshot.current = snapshotState();
        navigate(adminPath("products"));
      } else {
        console.log("DEBUG: API Payload", body);
        const res = await apiFetch("/products", { method: "POST", body: JSON.stringify(body) });
        const created = res.data as { _id?: string } | undefined;
        const createdId = created?._id;
        if (!createdId) {
          throw new Error("Product created but no id returned — refresh the product list.");
        }
        if (pendingFiles.length > 0) {
          try {
            const nextImages = await uploadFilesToProduct(String(createdId), pendingFiles);
            setImages(nextImages.map((img: { _id?: string; url: string; publicId?: string }) => ({
              _id: img._id,
              url: img.url,
              publicId: img.publicId,
            })));
            pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
            setPendingFiles([]);
            setPendingPreviews([]);
          } catch (uploadErr) {
            setSaving(false);
            navigate(adminPath("products", String(createdId), "edit"), {
              replace: true,
              state: { tab: "media" },
            });
            toast.error(
              uploadErr instanceof Error
                ? `Product saved but image upload failed: ${uploadErr.message}`
                : "Product saved but image upload failed."
            );
            return;
          }
        }
        setDirty(false);
        initialSnapshot.current = snapshotState();
        navigate(adminPath("products", String(createdId), "edit"), {
          replace: true,
          state: { tab: "media" },
        });
      }
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const removeProductImage = (imageId: string) => {
    if (!isEdit) return;
    imageDelete.requestDelete({ kind: "single", ids: [imageId], label: "this image" });
  };

  const setPolicy = (patch: Partial<typeof emptyReturnExchangePolicy>) => {
    setForm((f) => ({
      ...f,
      returnExchangePolicy: {
        return: { ...f.returnExchangePolicy.return, ...(patch.return || {}) },
        exchange: { ...f.returnExchangePolicy.exchange, ...(patch.exchange || {}) },
      },
    }));
    setDirty(true);
  };

  const addFaq = () => {
    if (!newFaq.question || !newFaq.answer) return;
    set("faqs", [...form.faqs, { ...newFaq }]);
    setNewFaq({ question: "", answer: "" });
  };

  const onPickProductImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (!getAdminToken()) {
      toast.warning("Please log in as admin to upload images.");
      navigate("/admin/login", { state: { from: window.location.pathname } });
      return;
    }

    if (!isEdit) {
      setPendingFiles((prev) => [...prev, ...files]);
      const previews = files.map((f) => URL.createObjectURL(f));
      setPendingPreviews((prev) => [...prev, ...previews]);
      setMediaMsg({
        type: "ok",
        text: `${files.length} image${files.length > 1 ? "s" : ""} selected — will upload when you save the product.`,
      });
      setDirty(true);
      return;
    }

    setMediaMsg(null);
    setUploadingImages(true);
    try {
      const nextImages = await uploadFilesToProduct(id!, files);
      setImages(nextImages.map((img) => ({ _id: img._id, url: img.url, publicId: img.publicId })));
      setMediaMsg({
        type: "ok",
        text: `${files.length} image${files.length > 1 ? "s" : ""} saved. They will show on the product page and listings.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image upload failed";
      setMediaMsg({ type: "err", text: msg });
      if (/log in|token|expired/i.test(msg)) {
        navigate("/admin/login", { state: { from: window.location.pathname } });
      } else {
        toast.error(msg);
      }
    } finally {
      setUploadingImages(false);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setDirty(true);
  };

  const executeRemoveImage = async (imageId: string) => {
    const res = await apiFetch(`/products/${id}/images/${imageId}`, { method: "DELETE" });
    const next = (res.data as { images?: typeof images })?.images || [];
    setImages(next.map(img => ({ _id: img._id, url: img.url, publicId: img.publicId })));
  };

  const TABS = useMemo(() => {
    const all = [
      { key: "info", label: "General" },
      { key: "cities", label: "Pricing & Inventory", simpleOnly: true },
      { key: "media", label: "Media" },
      { key: "variations", label: "Variants", variantOnly: true },
      { key: "relationships", label: "Recommendations", editOnly: true },
      { key: "seo", label: "SEO" },
      { key: "faqs", label: "FAQs" },
      { key: "policy", label: "Return & Exchange" },
    ] as const;
    const isVariant = form.productStructure === "variant";
    return all.filter((t) => {
      if ("simpleOnly" in t && t.simpleOnly && isVariant) return false;
      if ("variantOnly" in t && t.variantOnly && !isVariant) return false;
      if ("editOnly" in t && t.editOnly && !isEdit) return false;
      return true;
    });
  }, [form.productStructure, isEdit]);

  useEffect(() => {
    if (form.productStructure === "variant" && tab === "cities") setTab("info");
    if (form.productStructure === "simple" && tab === "variations") setTab("info");
  }, [form.productStructure, tab]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-sb-orange" /></div>;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="mb-6">
        <button onClick={goBack}
          className="flex items-center gap-2 text-sm text-sb-ink/55 hover:text-sb-ink mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="admin-page-title text-sb-ink">{isEdit ? "Edit Product" : "Add Product"}</h1>
            <p className="admin-page-desc">
              Configure product details, city pricing, wholesale slabs, and inventory in one place
              {dirty && <span className="text-sb-orange ml-2">· Unsaved changes</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => save("DRAFT")} disabled={saving}
              className="px-4 py-2.5 border border-sb-ink/15 rounded-lg text-sm text-sb-ink/60 hover:border-sb-ink/25 transition-colors disabled:opacity-60">
              Save Draft
            </button>
            <button onClick={() => save()} disabled={saving}
              className="flex items-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Update Product" : "Publish Product"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-sb-orange text-white" : "text-sb-ink/55 hover:text-sb-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* General Info */}
          {tab === "info" && (
            <Section title="General Information">
              <Field label="Product Name" required>
                <input className={inp} placeholder="e.g. Cement PPC 53 Grade" value={form.name} onChange={e => set("name", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="SKU" required>
                  <input className={inp} placeholder="CEM-PPC-53-001" value={form.sku} onChange={e => set("sku", e.target.value.toUpperCase())} />
                </Field>
                <Field label="GST Percentage" required>
                  <select className={sel} value={form.gstPercentage} onChange={e => set("gstPercentage", +e.target.value)}>
                    {[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Storefront price display">
                <select
                  className={sel}
                  value={form.priceIncludesGst ? "incl" : "excl"}
                  onChange={e => set("priceIncludesGst", e.target.value === "incl")}
                >
                  <option value="excl">Excluding GST (default)</option>
                  <option value="incl">Including GST</option>
                </select>
              </Field>
              <p className="text-xs text-sb-ink/50 -mt-2">
                {form.productStructure === "variant"
                  ? "Variant products use per-variant pricing in the Variants tab."
                  : "City prices are stored ex-GST. Use the Pricing & Inventory tab to set per-city selling price, MRP, stock, and wholesale slabs."}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" required>
                  <select className={sel} value={form.category} onChange={e => set("category", e.target.value)}>
                    <option value="">Select category</option>
                    {catalogCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Brand" required>
                  <select className={sel} value={form.brand} onChange={e => set("brand", e.target.value)} disabled={!form.category}>
                    <option value="">{form.category ? "Select brand" : "Select category first"}</option>
                    {brandSelectOptions.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </Field>
              </div>
              <p className="text-xs text-sb-ink/50 -mt-2">
                Brands are filtered by the <strong className="text-sb-ink/65">parent category</strong> set under{" "}
                <Link to={adminPath("brands")} className="text-sb-orange hover:underline">Brands</Link>
                {" "}(legacy brands with no category stay available for every category).
              </p>

              <Field label="Product structure" required>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.productStructure === "simple"
                        ? "border-sb-orange bg-sb-orange/5"
                        : "border-sb-ink/12 hover:border-sb-ink/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="productStructure"
                      className="mt-1 accent-sb-orange"
                      checked={form.productStructure === "simple"}
                      onChange={() => set("productStructure", "simple")}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-sb-ink">Simple product</span>
                      <span className="block text-xs text-sb-ink/50 mt-0.5">
                        One SKU, one price, one inventory per city (chemicals, tools, helmets).
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.productStructure === "variant"
                        ? "border-sb-orange bg-sb-orange/5"
                        : "border-sb-ink/12 hover:border-sb-ink/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="productStructure"
                      className="mt-1 accent-sb-orange"
                      checked={form.productStructure === "variant"}
                      onChange={() => set("productStructure", "variant")}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-sb-ink">Variant product</span>
                      <span className="block text-xs text-sb-ink/50 mt-0.5">
                        Multiple sizes/specs — each variant has its own SKU, city pricing &amp; stock.
                      </span>
                    </span>
                  </label>
                </div>
              </Field>

              <Field label="Short Description">
                <textarea className={`${inp} resize-none`} rows={2} placeholder="Brief description (max 500 chars)" value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)} />
              </Field>
              <Field label="Full Description">
                <textarea className={`${inp} resize-none`} rows={6} placeholder="Detailed product description, features and specifications..." value={form.description} onChange={e => set("description", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Display Order">
                  <input type="number" className={inp} min={0} value={form.displayOrder} onChange={e => set("displayOrder", +e.target.value)} />
                </Field>
                <Field label="Status">
                  <select className={sel} value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </Field>
              </div>
            </Section>
          )}

          {tab === "cities" && (
            <Section title="City-wise Pricing, Wholesale Slabs & Inventory">
              <p className="text-xs text-sb-ink/50 mb-4">
                Configure pricing and stock for each active city. A product appears on the storefront in a city when it has visible pricing and available stock.
                Manage serviceable cities under{" "}
                <Link to={adminPath("cities")} className="text-sb-orange hover:underline">Cities</Link>.
              </p>
              <ProductCityConfig
                configs={cityConfigs}
                onChange={handleCityConfigsChange}
                defaultTax={form.gstPercentage}
              />
            </Section>
          )}

          {/* Media */}
          {tab === "media" && (
            <Section title="Product Media">
              <Field label="Product Images">
                {!isEdit && (
                  <p className="text-xs text-sb-ink/50 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg p-3 flex items-start gap-2 mb-3">
                    <Info className="w-4 h-4 shrink-0 text-sb-orange mt-0.5" aria-hidden />
                    <span>
                      You can select images now — they upload automatically when you <strong>Save Draft</strong> or{" "}
                      <strong>Publish</strong>. After save you stay on this page to add more.
                    </span>
                  </p>
                )}
                {(images.length > 0 || pendingPreviews.length > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {images.map(img => (
                      <div key={img._id || img.url} className="relative group rounded-lg overflow-hidden border border-sb-ink/10 bg-[#111] aspect-square">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        {img._id && (
                          <button type="button" onClick={() => removeProductImage(img._id!)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/90">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {pendingPreviews.map((url, i) => (
                      <div key={url} className="relative group rounded-lg overflow-hidden border border-dashed border-sb-orange/40 bg-[#111] aspect-square">
                        <img src={url} alt="" className="w-full h-full object-cover opacity-90" />
                        <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-sb-orange/90 text-white px-1.5 py-0.5 rounded">
                          Pending save
                        </span>
                        <button
                          type="button"
                          onClick={() => removePendingImage(i)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center gap-3 ${
                  uploadingImages ? "border-sb-ink/10 opacity-60 cursor-wait" : "border-sb-ink/15 hover:border-sb-orange/40 cursor-pointer"
                }`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    multiple
                    className="hidden"
                    disabled={uploadingImages}
                    onChange={onPickProductImages}
                  />
                  {uploadingImages
                    ? <Loader2 className="w-8 h-8 animate-spin text-sb-orange" />
                    : <Upload className="w-8 h-8 text-sb-ink/40" />}
                  <div>
                    <p className="text-sm text-sb-ink/70 font-medium">
                      {uploadingImages ? "Uploading…" : "Click to upload product images"}
                    </p>
                    <p className="text-xs text-sb-ink/45 mt-1">JPEG, PNG or WebP — first image is used as the main thumbnail on the storefront</p>
                  </div>
                </label>
                {mediaMsg && (
                  <p className={`text-xs mt-3 rounded-lg px-3 py-2 border ${
                    mediaMsg.type === "ok"
                      ? "text-green-800 bg-green-50 border-green-200"
                      : "text-red-800 bg-red-50 border-red-200"
                  }`}>
                    {mediaMsg.text}
                  </p>
                )}
              </Field>
              <Field label="Product Videos">
                {form.videos.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className={`${inp} flex-1`} placeholder="Title" value={v.title} onChange={e => {
                      const vids = [...form.videos]; vids[i].title = e.target.value; set("videos", vids);
                    }} />
                    <input className={`${inp} flex-1`} placeholder="YouTube/Vimeo URL" value={v.url} onChange={e => {
                      const vids = [...form.videos]; vids[i].url = e.target.value; set("videos", vids);
                    }} />
                    <button onClick={() => set("videos", form.videos.filter((_, j) => j !== i))}
                      className="p-2 text-sb-ink/55 hover:bg-sb-cream-secondary rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => set("videos", [...form.videos, { title: "", url: "" }])}
                  className="flex items-center gap-2 text-sm text-sb-orange hover:text-sb-orange-hover transition-colors">
                  <Plus className="w-4 h-4" /> Add Video
                </button>
              </Field>
              <Field label="Product documents (PDF / spec sheets)">
                <p className="text-xs text-sb-ink/50 mb-2">Add display name and URL (e.g. from CMS upload or Cloudinary).</p>
                {form.documents.map((doc, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className={`${inp} flex-1`} placeholder="Document name" value={doc.name} onChange={e => {
                      const next = [...form.documents]; next[i] = { ...next[i], name: e.target.value }; set("documents", next);
                    }} />
                    <input className={`${inp} flex-1`} placeholder="https://..." value={doc.url} onChange={e => {
                      const next = [...form.documents]; next[i] = { ...next[i], url: e.target.value }; set("documents", next);
                    }} />
                    <button type="button" onClick={() => set("documents", form.documents.filter((_, j) => j !== i))}
                      className="p-2 text-sb-ink/55 hover:bg-sb-cream-secondary rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => set("documents", [...form.documents, { name: "", url: "" }])}
                  className="flex items-center gap-2 text-sm text-sb-orange hover:text-sb-orange-hover transition-colors">
                  <Plus className="w-4 h-4" /> Add document
                </button>
              </Field>
            </Section>
          )}

          {/* Variations */}
          {tab === "variations" && form.productStructure === "variant" && (
            <Section title="Variant configuration">
              {!isEdit && (
                <p className="text-xs text-sb-ink/50 bg-sb-cream-secondary border border-sb-ink/10 rounded-lg p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-sb-orange mt-0.5" aria-hidden />
                  <span>Save the product first (structure = Variant Product), then add variants with dynamic attributes and per-city pricing.</span>
                </p>
              )}
              {isEdit && id && (
                <>
                  {variations.length === 0 && (
                    <p className="text-xs text-sb-ink/50 mb-3">
                      Add variants with dynamic attributes (Size, Thickness, etc.). Each variant has its own SKU, city pricing, inventory, and wholesale slabs.
                    </p>
                  )}
                  <ProductVariantManager
                    productId={id}
                    productSku={form.sku}
                    gstPercentage={form.gstPercentage}
                    activeCities={activeCities}
                    variations={variations}
                    onVariationsChange={setVariations}
                  />
                </>
              )}
            </Section>
          )}

          {/* SEO */}
          {tab === "seo" && (
            <Section title="SEO Settings">
              <Field label="Meta Title">
                <input className={inp} placeholder="SEO title (max 60 chars)" value={form.seo.metaTitle}
                  onChange={e => set("seo", { ...form.seo, metaTitle: e.target.value })} />
              </Field>
              <Field label="Meta Description">
                <textarea className={`${inp} resize-none`} rows={3} placeholder="SEO description (max 160 chars)"
                  value={form.seo.metaDescription} onChange={e => set("seo", { ...form.seo, metaDescription: e.target.value })} />
              </Field>
              <Field label="Meta Keywords (comma separated)">
                <input className={inp} placeholder="cement, construction, building materials"
                  value={form.seo.metaKeywords?.join(", ")}
                  onChange={e => set("seo", { ...form.seo, metaKeywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) })} />
              </Field>
            </Section>
          )}

          {/* FAQs */}
          {tab === "faqs" && (
            <Section title="Product FAQs">
              {form.faqs.map((faq, i) => (
                <div key={i} className="p-3 bg-[#111] border border-sb-ink/10 rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-sb-ink">Q: {faq.question}</p>
                    <button onClick={() => set("faqs", form.faqs.filter((_, j) => j !== i))}
                      className="p-1 text-sb-ink/55 hover:bg-sb-cream-secondary rounded shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-sb-ink/55">A: {faq.answer}</p>
                </div>
              ))}
              <div className="border border-sb-ink/10 rounded-lg p-4 space-y-3 bg-sb-cream">
                <Field label="Question">
                  <input className={inp} value={newFaq.question} onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))} />
                </Field>
                <Field label="Answer">
                  <textarea className={`${inp} resize-none`} rows={2} value={newFaq.answer} onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))} />
                </Field>
                <button onClick={addFaq} className="flex items-center gap-2 bg-sb-orange/15 hover:bg-sb-orange/25 text-sb-orange font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                  <Plus className="w-4 h-4" /> Add FAQ
                </button>
              </div>
            </Section>
          )}

          {/* Relationships / Recommendations */}
          {tab === "relationships" && isEdit && (
            <Section title="Product Recommendations">
              <p className="text-xs text-sb-ink/50 mb-4">
                Configure which products appear as recommendations. <strong>Upsell products</strong> are shown in the cart page ("You may also like"), 
                while <strong>Cross-sell products</strong> appear on the product detail page ("Related products").
              </p>
              <ProductRelationshipManager
                productId={id!}
                initialUpsells={upsellProducts}
                initialCrossSells={crossSellProducts}
              />
            </Section>
          )}

          {tab === "policy" && (
            <Section title="Return & Exchange Policy">
              <p className="text-xs text-sb-ink/50 mb-4">
                Configure product-specific return and exchange rules. Shown on the storefront product page.
              </p>

              <div className="space-y-6">
                <div className="rounded-xl border border-sb-ink/10 bg-white p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-sb-ink">Return Policy</h4>
                  <Toggle
                    checked={form.returnExchangePolicy.return.allowed}
                    onChange={(v) => setPolicy({ return: { allowed: v } })}
                    label="Return Allowed"
                    icon={Shield}
                  />
                  <Field label="Return Window (Days)">
                    <input
                      type="number"
                      min={0}
                      className={inp}
                      value={form.returnExchangePolicy.return.windowDays}
                      onChange={(e) =>
                        setPolicy({
                          return: {
                            windowDays: e.target.value === "" ? "" : Number(e.target.value),
                          },
                        })
                      }
                      placeholder="e.g. 7"
                    />
                  </Field>
                  <Field label="Return Instructions">
                    <textarea
                      className={`${inp} resize-none`}
                      rows={4}
                      value={form.returnExchangePolicy.return.instructions}
                      onChange={(e) => setPolicy({ return: { instructions: e.target.value } })}
                      placeholder="Steps customer must follow to initiate a return…"
                    />
                  </Field>
                  <PolicyStringList
                    label="Return Conditions"
                    items={form.returnExchangePolicy.return.conditions}
                    onChange={(conditions) => setPolicy({ return: { conditions } })}
                    placeholder="e.g. Product must be unused"
                  />
                  <PolicyStringList
                    label="Non-Returnable Conditions"
                    items={form.returnExchangePolicy.return.nonReturnableConditions}
                    onChange={(nonReturnableConditions) => setPolicy({ return: { nonReturnableConditions } })}
                    placeholder="e.g. Opened bags"
                  />
                </div>

                <div className="rounded-xl border border-sb-ink/10 bg-white p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-sb-ink">Exchange Policy</h4>
                  <Toggle
                    checked={form.returnExchangePolicy.exchange.allowed}
                    onChange={(v) => setPolicy({ exchange: { allowed: v } })}
                    label="Exchange Allowed"
                    icon={RefreshCw}
                  />
                  <Field label="Exchange Window (Days)">
                    <input
                      type="number"
                      min={0}
                      className={inp}
                      value={form.returnExchangePolicy.exchange.windowDays}
                      onChange={(e) =>
                        setPolicy({
                          exchange: {
                            windowDays: e.target.value === "" ? "" : Number(e.target.value),
                          },
                        })
                      }
                      placeholder="e.g. 10"
                    />
                  </Field>
                  <Field label="Exchange Instructions">
                    <textarea
                      className={`${inp} resize-none`}
                      rows={4}
                      value={form.returnExchangePolicy.exchange.instructions}
                      onChange={(e) => setPolicy({ exchange: { instructions: e.target.value } })}
                      placeholder="Steps customer must follow to request an exchange…"
                    />
                  </Field>
                  <PolicyStringList
                    label="Exchange Conditions"
                    items={form.returnExchangePolicy.exchange.conditions}
                    onChange={(conditions) => setPolicy({ exchange: { conditions } })}
                    placeholder="e.g. Original packaging required"
                  />
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Section title="Delivery Type">
            <Field label="Fulfillment model" required>
              <select
                className={inp}
                value={form.deliveryType}
                onChange={(e) => set("deliveryType", e.target.value)}
                required
              >
                <option value="vendor_delivery">Type A — Vendor delivery</option>
                <option value="structbay_delivery">Type B — Structbay delivery</option>
              </select>
            </Field>
            <p className="text-xs text-sb-ink/50 mt-2">
              Sets the default fulfillment workflow for this product on new orders.
            </p>
          </Section>

          <Section title="Product Badges">
            <div className="space-y-2">
              <Toggle checked={form.isAssured} onChange={v => set("isAssured", v)} label="Structbay Assured" icon={Shield} />
              <Toggle checked={form.isExpress} onChange={v => set("isExpress", v)} label="Structbay Express" icon={Zap} />
              <Toggle checked={form.isFeatured} onChange={v => set("isFeatured", v)} label="Featured Product" icon={Star} />
              <Toggle checked={form.isTopSelling} onChange={v => set("isTopSelling", v)} label="Top Selling" icon={TrendingUp} />
            </div>
          </Section>

          <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sb-ink text-sm">Quick Save</h3>
            <button onClick={() => save()} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-sb-orange hover:bg-sb-orange-hover text-white font-bold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Update Product" : "Publish Product"}
            </button>
            <button onClick={goBack}
              className="w-full py-2.5 border border-sb-ink/15 rounded-lg text-sm text-sb-ink/60 hover:border-sb-ink/25 transition-colors">
              Cancel
            </button>
          </div>

          {cityConfigs.length > 0 && (
            <div className="bg-sb-cream-secondary border border-sb-ink/10 rounded-xl p-4">
              <h3 className="font-semibold text-sb-ink text-sm mb-2">City Summary</h3>
              <p className="text-xs text-sb-ink/55">
                {cityConfigs.filter(c => c.pricing.sellingPrice !== "").length} cities with pricing ·{" "}
                {cityConfigs.filter(c => c.inventory.quantity !== "" && Number(c.inventory.quantity) > 0).length} cities with stock
              </p>
            </div>
          )}
        </div>
      </div>

      <AdminDeleteConfirmModal
        open={!!imageDelete.pending}
        title={imageDelete.modalTitle}
        description={imageDelete.modalDescription}
        busy={imageDelete.busy}
        onCancel={imageDelete.cancelDelete}
        onConfirm={() => void imageDelete.executeDelete(executeRemoveImage)}
      />
    </div>
  );
}
