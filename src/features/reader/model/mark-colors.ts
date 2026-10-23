/** Highlighter inks. Selection while dragging stays a cool wash, not one of these. */
export const MARK_COLORS = {
  brass: { label: "Brass", fill: "#e2bb68" },
  lemon: { label: "Lemon", fill: "#f0d85a" },
  rose: { label: "Rose", fill: "#e89aab" },
  sage: { label: "Sage", fill: "#8fbf8a" },
  sky: { label: "Sky", fill: "#8eb8e0" },
  lilac: { label: "Lilac", fill: "#b9a6dc" },
} as const;

export type MarkColor = keyof typeof MARK_COLORS;

export const MARK_COLOR_ORDER = Object.keys(MARK_COLORS) as MarkColor[];

export function markFill(color: MarkColor | undefined, fallback: MarkColor = "brass") {
  return MARK_COLORS[color && color in MARK_COLORS ? color : fallback].fill;
}

/** A see-through wash so the words stay readable under the mark. */
export function markWash(color: MarkColor | undefined, fallback: MarkColor = "brass") {
  return `color-mix(in srgb, ${markFill(color, fallback)} 48%, transparent)`;
}
