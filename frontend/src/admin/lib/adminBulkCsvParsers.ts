import { splitCsvLine } from "./bulkCsv";

function headerIndex(header: string[], names: string[]): number {
  for (const n of names) {
    const j = header.indexOf(n.toLowerCase());
    if (j >= 0) return j;
  }
  return -1;
}

function parseLines(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map((l) => splitCsvLine(l));
}

/** Categories → POST /categories/bulk-import */
export const CATEGORY_BULK_TEMPLATE = `name,description,icon,sortOrder,status
Civil Construction,Materials for civil works,,0,ACTIVE`;

export function parseCategoryBulkCsv(text: string): Record<string, string>[] {
  const lines = parseLines(text);
  if (lines.length < 2) return [];
  const header = lines[0].map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
  const iName = headerIndex(header, ["name"]);
  if (iName < 0) throw new Error('CSV must include column: name');
  const iDesc = headerIndex(header, ["description", "desc"]);
  const iIcon = headerIndex(header, ["icon"]);
  const iSort = headerIndex(header, ["sortorder", "sort_order"]);
  const iStatus = headerIndex(header, ["status"]);
  const out: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r += 1) {
    const cells = lines[r];
    const get = (i: number) => (i >= 0 && cells[i] !== undefined ? cells[i].trim() : "");
    const name = get(iName);
    if (!name) continue;
    const row: Record<string, string> = { name };
    const d = get(iDesc);
    if (d) row.description = d;
    const ic = get(iIcon);
    if (ic) row.icon = ic;
    const so = get(iSort);
    if (so !== "") row.sortOrder = so;
    const st = get(iStatus);
    if (st) row.status = st;
    out.push(row);
  }
  return out;
}

/** Cities → POST /cities/bulk-import */
export const CITY_BULK_TEMPLATE = `name,state,pincodes,status,isServiceable,priority,sortOrder
Bengaluru,Karnataka,"560001, 560002",ACTIVE,true,0,0`;

export function parseCityBulkCsv(text: string): Record<string, string>[] {
  const lines = parseLines(text);
  if (lines.length < 2) return [];
  const header = lines[0].map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
  const iName = headerIndex(header, ["name", "city", "city_name"]);
  const iState = headerIndex(header, ["state"]);
  if (iName < 0 || iState < 0) throw new Error("CSV must include columns: name (or city), state");
  const iPins = headerIndex(header, ["pincodes", "pins", "pin_codes", "pin codes"]);
  const iStatus = headerIndex(header, ["status"]);
  const iServ = headerIndex(header, ["isserviceable", "is_serviceable", "serviceable"]);
  const iPri = headerIndex(header, ["priority"]);
  const iSort = headerIndex(header, ["sortorder", "sort_order"]);
  const out: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r += 1) {
    const cells = lines[r];
    const get = (i: number) => (i >= 0 && cells[i] !== undefined ? cells[i].trim() : "");
    const name = get(iName);
    const state = get(iState);
    if (!name || !state) continue;
    const row: Record<string, string> = { name, state };
    const pins = get(iPins);
    if (pins) row.pincodes = pins;
    const st = get(iStatus);
    if (st) row.status = st;
    const sv = get(iServ);
    if (sv !== "") row.isServiceable = sv;
    const pr = get(iPri);
    if (pr !== "") row.priority = pr;
    const so = get(iSort);
    if (so !== "") row.sortOrder = so;
    out.push(row);
  }
  return out;
}

/** Brands → POST /brands/bulk-import */
export const BRAND_BULK_TEMPLATE = `name,categorySlug,description,sortOrder,status
Example Brand,cement,Optional notes,0,ACTIVE`;

export function parseBrandBulkCsv(text: string): Record<string, string>[] {
  const lines = parseLines(text);
  if (lines.length < 2) return [];
  const header = lines[0].map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
  const iName = headerIndex(header, ["name", "brand", "brand_name"]);
  const iCatSlug = headerIndex(header, ["categoryslug", "category_slug"]);
  const iCatId = headerIndex(header, ["categoryid", "category_id"]);
  const iCatName = headerIndex(header, ["categoryname", "category_name"]);
  if (iName < 0) throw new Error("CSV must include column: name");
  if (iCatSlug < 0 && iCatId < 0 && iCatName < 0) {
    throw new Error("CSV must include one of: categorySlug, categoryId, or categoryName");
  }
  const iDesc = headerIndex(header, ["description", "desc"]);
  const iSort = headerIndex(header, ["sortorder", "sort_order"]);
  const iStatus = headerIndex(header, ["status"]);
  const out: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r += 1) {
    const cells = lines[r];
    const get = (i: number) => (i >= 0 && cells[i] !== undefined ? cells[i].trim() : "");
    const name = get(iName);
    if (!name) continue;
    const catSlug = get(iCatSlug);
    const catId = get(iCatId);
    const catName = get(iCatName);
    if (!catSlug && !catId && !catName) continue;
    const row: Record<string, string> = { name };
    if (catId) row.categoryId = catId;
    else if (catSlug) row.categorySlug = catSlug;
    else row.categoryName = catName;
    const d = get(iDesc);
    if (d) row.description = d;
    const so = get(iSort);
    if (so !== "") row.sortOrder = so;
    const st = get(iStatus);
    if (st) row.status = st;
    out.push(row);
  }
  return out;
}

/** City pricing → POST /pricing/bulk-import */
export const CITY_PRICING_BULK_TEMPLATE = `sku,citySlug,regularPrice,salePrice,isVisible,wholesaleSlabs
SKU-DEMO-001,bengaluru,450,420,true,50:400|100:395`;

export function parseCityPricingBulkCsv(text: string): Record<string, string>[] {
  const lines = parseLines(text);
  if (lines.length < 2) return [];
  const header = lines[0].map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
  const iSku = headerIndex(header, ["sku", "product_sku"]);
  const iPid = headerIndex(header, ["productid", "product_id"]);
  if (iSku < 0 && iPid < 0) throw new Error("CSV must include column: sku or productId");
  const iCitySlug = headerIndex(header, ["cityslug", "city_slug"]);
  const iCityId = headerIndex(header, ["cityid", "city_id"]);
  const iCityName = headerIndex(header, ["cityname", "city_name", "city"]);
  if (iCitySlug < 0 && iCityId < 0 && iCityName < 0) {
    throw new Error("CSV must include one of: citySlug, cityId, or cityName");
  }
  const iReg = headerIndex(header, ["regularprice", "regular_price", "mrp"]);
  if (iReg < 0) throw new Error("CSV must include column: regularPrice");
  const iSale = headerIndex(header, ["saleprice", "sale_price"]);
  const iVis = headerIndex(header, ["isvisible", "is_visible", "visible"]);
  const iVarSku = headerIndex(header, ["variationsku", "variation_sku"]);
  const iVarId = headerIndex(header, ["variationid", "variation_id"]);
  const iSlabs = headerIndex(header, ["wholesaleslabs", "wholesale_slabs", "slabs"]);
  const out: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r += 1) {
    const cells = lines[r];
    const get = (i: number) => (i >= 0 && cells[i] !== undefined ? cells[i].trim() : "");
    const sku = get(iSku);
    const pid = get(iPid);
    if (!sku && !pid) continue;
    const reg = get(iReg);
    if (!reg) continue;
    const cs = get(iCitySlug);
    const cid = get(iCityId);
    const cn = get(iCityName);
    if (!cs && !cid && !cn) continue;
    const row: Record<string, string> = { regularPrice: reg };
    if (pid) row.productId = pid;
    else row.sku = sku;
    if (cid) row.cityId = cid;
    else if (cs) row.citySlug = cs;
    else row.cityName = cn;
    if (iSale >= 0) row.salePrice = get(iSale);
    if (iVis >= 0) row.isVisible = get(iVis);
    const vs = get(iVarSku);
    if (vs) row.variationSku = vs;
    const vid = get(iVarId);
    if (vid) row.variationId = vid;
    if (iSlabs >= 0) row.wholesaleSlabs = get(iSlabs);
    out.push(row);
  }
  return out;
}

/** Products → POST /products/bulk-import */
export const PRODUCT_BULK_TEMPLATE = `name,sku,categorySlug,brandName,status,gstPercentage,shortDescription,description,displayOrder,isFeatured,isTopSelling,isAssured,isExpress
Sample Product,SKU-DEMO-001,cement,UltraTech,DRAFT,18,Short text,,0,false,false,false,false`;

export function parseProductBulkCsv(text: string): Record<string, string>[] {
  const lines = parseLines(text);
  if (lines.length < 2) return [];
  const header = lines[0].map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
  const iName = headerIndex(header, ["name", "product_name"]);
  const iSku = headerIndex(header, ["sku", "product_sku"]);
  const iCatSlug = headerIndex(header, ["categoryslug", "category_slug"]);
  const iCatId = headerIndex(header, ["categoryid", "category_id"]);
  const iBrandName = headerIndex(header, ["brandname", "brand_name", "brand"]);
  const iBrandId = headerIndex(header, ["brandid", "brand_id"]);
  if (iName < 0 || iSku < 0) throw new Error("CSV must include columns: name, sku");
  if ((iCatSlug < 0 && iCatId < 0) || (iBrandName < 0 && iBrandId < 0)) {
    throw new Error("CSV must include category (categorySlug or categoryId) and brand (brandName or brandId)");
  }
  const iStatus = headerIndex(header, ["status"]);
  const iGst = headerIndex(header, ["gstpercentage", "gst_percentage", "gst"]);
  const iShort = headerIndex(header, ["shortdescription", "short_description"]);
  const iDesc = headerIndex(header, ["description"]);
  const iDisp = headerIndex(header, ["displayorder", "display_order"]);
  const iFeat = headerIndex(header, ["isfeatured", "is_featured"]);
  const iTop = headerIndex(header, ["istopselling", "is_top_selling"]);
  const iAss = headerIndex(header, ["isassured", "is_assured"]);
  const iExp = headerIndex(header, ["isexpress", "is_express"]);
  const out: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r += 1) {
    const cells = lines[r];
    const get = (i: number) => (i >= 0 && cells[i] !== undefined ? cells[i].trim() : "");
    const name = get(iName);
    const sku = get(iSku);
    if (!name || !sku) continue;
    const catSlug = get(iCatSlug);
    const catId = get(iCatId);
    const bn = get(iBrandName);
    const bid = get(iBrandId);
    if ((!catSlug && !catId) || (!bn && !bid)) continue;
    const row: Record<string, string> = { name, sku };
    if (catId) row.categoryId = catId;
    else row.categorySlug = catSlug;
    if (bid) row.brandId = bid;
    else row.brandName = bn;
    const st = get(iStatus);
    if (st) row.status = st;
    const gst = get(iGst);
    if (gst !== "") row.gstPercentage = gst;
    const sh = get(iShort);
    if (sh) row.shortDescription = sh;
    const d = get(iDesc);
    if (d) row.description = d;
    const disp = get(iDisp);
    if (disp !== "") row.displayOrder = disp;
    const f = get(iFeat);
    if (f !== "") row.isFeatured = f;
    const t = get(iTop);
    if (t !== "") row.isTopSelling = t;
    const a = get(iAss);
    if (a !== "") row.isAssured = a;
    const e = get(iExp);
    if (e !== "") row.isExpress = e;
    out.push(row);
  }
  return out;
}
