/**
 * Royal Paan Family Restaurant Theme Colors
 * Inspired by the elegant logo design with warm cream, gold, and brown tones
 */

export const THEME_COLORS = {
  // Primary palette from logo
  gold: {
    primary: "#c7922f",
    dark: "#9d6e23",
    light: "#e8b872",
    soft: "#fbf1dc",
  },
  cream: {
    primary: "#fbf6ec",
    deep: "#f3eadb",
    card: "#fffdf9",
  },
  brown: {
    primary: "#1f1a17",
    muted: "#6e665c",
    light: "#8b7f76",
  },

  // Leaf green (complementary)
  leaf: {
    primary: "#1e5631",
    dark: "#133b21",
    soft: "#e5f0e7",
  },

  // Pink accent (from signboard)
  rani: {
    primary: "#b0156c",
    dark: "#8a0f54",
    soft: "#fbe6f1",
  },

  // Functional colors
  border: "#e9dfcd",
  success: "#1e7a45",
  successSoft: "#e3f3e8",
  danger: "#c0392b",
  dangerSoft: "#fdecea",
  warn: "#b7791f",
  warnSoft: "#fdf3dd",

  // Table status colors
  tableStatus: {
    available: "#1e7a45", // Green
    occupied: "#b7791f", // Orange/Amber
    billed: "#4b7db8", // Blue
  },

  // Shadows
  shadow: {
    card: "0 1px 2px rgb(31 26 23 / 0.04), 0 6px 20px -6px rgb(31 26 23 / 0.1)",
    float: "0 10px 30px -8px rgb(31 26 23 / 0.35)",
  },
} as const;

export type ThemeColor = typeof THEME_COLORS;
