/** Structbay Shared Theme — Tailwind class bundles (enterprise cream + black chrome). */

export const theme = {
  pageBg: "bg-sb-cream min-h-screen text-sb-ink",
  surface: "bg-sb-cream-secondary",
  card: "bg-sb-cream border border-sb-ink/10 rounded-xl shadow-sm",
  cardRaised: "bg-sb-cream-secondary border border-sb-ink/10 rounded-xl shadow-sm",

  heading: "text-sb-ink font-semibold tracking-tight",
  subheading: "text-sb-ink font-semibold",
  body: "text-sb-ink",
  muted: "text-sb-ink/55",
  label: "text-sb-ink/55 text-xs font-semibold uppercase tracking-widest",

  btnPrimary:
    "bg-sb-orange hover:bg-sb-orange-hover text-white font-semibold rounded-lg px-4 py-2.5 transition-colors duration-200 inline-flex items-center gap-2",
  btnSecondary:
    "bg-sb-cream border border-sb-ink text-sb-ink hover:bg-sb-orange-subtle hover:border-sb-orange hover:text-sb-orange font-semibold rounded-lg px-4 py-2.5 transition-all duration-200 inline-flex items-center gap-2",
  btnGhost:
    "bg-transparent hover:bg-sb-cream-secondary text-sb-ink/60 hover:text-sb-ink rounded-lg px-3 py-2 transition-colors duration-150 inline-flex items-center gap-2",
  btnDanger:
    "bg-transparent border border-sb-ink/25 text-sb-ink hover:border-sb-ink hover:bg-sb-cream-secondary rounded-lg px-4 py-2.5 transition-all duration-200 inline-flex items-center gap-2 text-sm font-semibold",

  input:
    "bg-sb-cream border border-sb-ink/15 text-sb-ink placeholder:text-sb-ink/45 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-sb-orange focus:ring-2 focus:ring-sb-orange/20 transition-colors w-full",
  inputLabel: "block text-sb-ink/55 text-xs font-semibold uppercase tracking-wider mb-1.5",

  table: "w-full text-sm",
  thead: "border-b border-sb-ink/10",
  th: "text-left py-3 px-4 text-xs font-semibold uppercase tracking-widest text-sb-ink/50",
  td: "py-3.5 px-4 text-sb-ink border-b border-sb-ink/8",
  trHover: "hover:bg-sb-cream-secondary/80 transition-colors",

  badgeOrange: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sb-orange text-white",
  badgeGold: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sb-orange/15 text-sb-orange border border-sb-orange/25",
  badgeMuted: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sb-cream-secondary text-sb-ink/70 border border-sb-ink/10",
  badgeSuccess:
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sb-orange/12 text-sb-orange border border-sb-orange/22",
  badgeDanger:
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sb-cream-secondary text-sb-ink border border-sb-ink/20",
  badgeWarning:
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sb-cream-secondary text-sb-orange border border-sb-orange/25",

  sidebarBg: "bg-sb-ink border-r border-sb-border-dark",
  sidebarItem:
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-sb-cream/65 hover:text-sb-cream hover:bg-sb-cream/10",
  sidebarActive:
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold border-l-2 border-sb-orange pl-[10px] bg-sb-cream text-sb-ink",

  orangeLine: "border-l-2 border-sb-orange pl-3",

  divider: "border-sb-ink/10",
} as const;
