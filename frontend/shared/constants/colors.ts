/** StructBay Brand Color Tokens */
export const colors = {
  black:          '#0D0D0D',
  blackSecondary: '#171717',
  charcoal:       '#222222',
  charcoalLight:  '#2A2A2A',
  charcoalMuted:  '#333333',
  cream:          '#F4E9D8',
  creamSoft:      '#EADCC6',
  creamMuted:     '#D4C4A8',
  /** Primary brand orange — matches StructBay logo */
  orange:         '#FE5E00',
  orangeHover:    '#E05200',
  gold:           '#C9A227',
  goldLight:      '#E8C547',
  success:        '#16a34a',
  danger:         '#dc2626',
  warning:        '#d97706',
} as const;

export type ColorToken = keyof typeof colors;

/** Recharts-safe color array */
export const chartColors = [
  colors.orange,
  colors.gold,
  colors.creamSoft,
  colors.orangeHover,
  colors.cream,
];
