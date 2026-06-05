/** StructBay Shared Theme — className strings for consistent cross-panel styling */

export const theme = {
  /* ── Surfaces ─────────────────────────────────────────────────────────── */
  pageBg:      'bg-[#0D0D0D] min-h-screen',
  surface:     'bg-[#171717]',
  card:        'bg-[#222222] border border-white/10 rounded-xl',
  cardRaised:  'bg-[#2A2A2A] border border-white/15 rounded-xl',
  glass:       'bg-[#222222]/70 backdrop-blur-md border border-white/15 rounded-xl',

  /* ── Typography ───────────────────────────────────────────────────────── */
  heading:     'text-[#F4E9D8] font-bold tracking-tight',
  subheading:  'text-[#EADCC6] font-semibold',
  body:        'text-[#F4E9D8]',
  muted:       'text-[#D4C4A8]/70',
  label:       'text-[#D4C4A8] text-xs font-semibold uppercase tracking-widest',

  /* ── Buttons ──────────────────────────────────────────────────────────── */
  btnPrimary:  'bg-[#FE5E00] hover:bg-[#E05200] text-[#0D0D0D] font-semibold rounded-lg px-4 py-2.5 transition-colors duration-200 inline-flex items-center gap-2',
  btnSecondary:'bg-transparent border border-white/20 hover:border-[#FE5E00] hover:bg-[#FE5E00] hover:text-[#0D0D0D] text-[#F4E9D8] font-medium rounded-lg px-4 py-2.5 transition-all duration-200 inline-flex items-center gap-2',
  btnGhost:    'bg-transparent hover:bg-[#2A2A2A] text-[#D4C4A8] hover:text-[#F4E9D8] rounded-lg px-3 py-2 transition-colors duration-150 inline-flex items-center gap-2',
  btnDanger:   'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 rounded-lg px-4 py-2.5 transition-all duration-200 inline-flex items-center gap-2',

  /* ── Inputs ───────────────────────────────────────────────────────────── */
  input:       'bg-[#222222] border border-white/15 text-[#F4E9D8] placeholder:text-[#D4C4A8]/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#FE5E00] focus:ring-2 focus:ring-[#FE5E00]/20 transition-colors w-full',
  inputLabel:  'block text-[#D4C4A8] text-xs font-semibold uppercase tracking-wider mb-1.5',

  /* ── Table ────────────────────────────────────────────────────────────── */
  table:       'w-full text-sm',
  thead:       'border-b border-white/10',
  th:          'text-left py-3 px-4 text-xs font-semibold uppercase tracking-widest text-[#D4C4A8]/70',
  td:          'py-3.5 px-4 text-[#F4E9D8] border-b border-white/5',
  trHover:     'hover:bg-white/[0.025] transition-colors',

  /* ── Badges ───────────────────────────────────────────────────────────── */
  badgeOrange:  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FE5E00] text-[#0D0D0D]',
  badgeGold:    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C9A227] text-[#0D0D0D]',
  badgeMuted:   'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-[#D4C4A8]',
  badgeSuccess: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20',
  badgeDanger:  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20',
  badgeWarning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20',

  /* ── Sidebar ──────────────────────────────────────────────────────────── */
  sidebarBg:     'bg-[#0D0D0D] border-r border-white/8',
  sidebarItem:   'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-[#D4C4A8]/80 hover:text-[#F4E9D8] hover:bg-[#222222]',
  sidebarActive: 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-[#FE5E00]/15 text-[#FE5E00] border-l-2 border-[#FE5E00]',

  /* ── Orange accent line ───────────────────────────────────────────────── */
  orangeLine:  'border-l-2 border-[#FE5E00] pl-3',

  /* ── Dividers ─────────────────────────────────────────────────────────── */
  divider:     'border-white/8',
} as const;
