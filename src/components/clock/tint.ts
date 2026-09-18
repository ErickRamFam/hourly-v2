/** Unlit ring tint (DESIGN.md §6): the lap stop desaturated toward slate, then at `alpha`. */
export function ringTint(stop: string, alpha = 'var(--ring-tint)'): string {
  return `color-mix(in oklab, color-mix(in oklab, ${stop} 55%, var(--slate)) ${alpha}, transparent)`
}

/** Lantern wedges (§6, critique 02 m6): 25% of the stop into slate, so the face reads as one soft disc. */
export function lanternTint(stop: string): string {
  return `color-mix(in oklab, color-mix(in oklab, ${stop} 25%, var(--slate)) var(--lantern-tint), transparent)`
}
