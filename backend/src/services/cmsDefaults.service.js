const { DEFAULT_POLICIES, DEFAULT_FOOTER_QUICK_LINKS } = require('../constants/defaultPolicies');
const { DEFAULT_LANDING_PAGES } = require('../constants/defaultLandingPages');

/**
 * Seed missing footer quick links and policy pages into the singleton CMS doc.
 * @param {import('mongoose').Document} doc
 * @returns {Promise<boolean>} whether doc was modified
 */
async function ensureCmsDefaults(doc) {
  let changed = false;

  if (!Array.isArray(doc.footer?.quickLinks) || doc.footer.quickLinks.length === 0) {
    doc.footer.quickLinks = DEFAULT_FOOTER_QUICK_LINKS.map((l) => ({ ...l }));
    changed = true;
  }

  if (!Array.isArray(doc.policies)) {
    doc.policies = [];
    changed = true;
  }

  const existingSlugs = new Set(doc.policies.map((p) => String(p.slug || '').toLowerCase()));
  for (const def of DEFAULT_POLICIES) {
    if (!existingSlugs.has(def.slug)) {
      doc.policies.push({ ...def, sections: def.sections.map((s) => ({ title: s.title, body: [...s.body] })) });
      changed = true;
    }
  }

  if (changed) {
    doc.policies.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  if (!Array.isArray(doc.landingPages)) {
    doc.landingPages = [];
    changed = true;
  }
  const lpSlugs = new Set(doc.landingPages.map((p) => String(p.slug || '').toLowerCase()));
  for (const def of DEFAULT_LANDING_PAGES) {
    if (!lpSlugs.has(def.slug)) {
      doc.landingPages.push({
        ...def,
        sections: def.sections.map((s) => ({ title: s.title, body: [...s.body] })),
      });
      changed = true;
    }
  }

  if (changed) {
    doc.landingPages.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    await doc.save();
  }

  return changed;
}

function policyForResponse(policy) {
  if (!policy) return null;
  const p = policy.toObject ? policy.toObject() : { ...policy };
  return {
    _id: p._id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle || '',
    lastUpdated: p.lastUpdated || '',
    sections: Array.isArray(p.sections)
      ? p.sections.map((s) => ({
          title: s.title,
          body: Array.isArray(s.body) ? s.body : [],
        }))
      : [],
    isActive: p.isActive !== false,
    sortOrder: Number(p.sortOrder) || 0,
  };
}

function landingPageForResponse(page) {
  if (!page) return null;
  const p = page.toObject ? page.toObject() : { ...page };
  return {
    _id: p._id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle || '',
    pageType: p.pageType || 'content',
    calculatorType: p.calculatorType || 'none',
    sections: Array.isArray(p.sections)
      ? p.sections.map((s) => ({
          title: s.title,
          body: Array.isArray(s.body) ? s.body : [],
        }))
      : [],
    isActive: p.isActive !== false,
    sortOrder: Number(p.sortOrder) || 0,
  };
}

module.exports = { ensureCmsDefaults, policyForResponse, landingPageForResponse, DEFAULT_FOOTER_QUICK_LINKS };
