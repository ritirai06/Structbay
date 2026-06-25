/** Returns true for category slugs/paths that show an RFQ modal instead of a product listing. */
export function isRfqOnlyCategory(value: string | undefined): boolean {
  const text = decodeURIComponent(String(value || ""))
    .toLowerCase()
    .replace(/\+/g, " ")
    .replace(/-/g, " ")
    .replace(/&/g, "and");

  const isSand =
    /m[\s]*sand/.test(text) ||
    (text.includes("sand") && text.includes("aggregate")) ||
    text.includes("aggregates");

  const isConcrete =
    text.includes("ready mix concrete") ||
    text.includes("ready mix") ||
    text.includes("readymix") ||
    (text.includes("concrete") && !text.includes("block") && !text.includes("cement"));

  return isSand || isConcrete;
}
