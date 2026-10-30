export type DialId = 'sector' | 'hairline' | 'rays' | 'lantern' | 'orbit'

export type Dial = {
  id: DialId
  name: string
  description: string
  price: number
}

export const DEFAULT_DIAL_ID: DialId = 'lantern'

// Copy and prices from DESIGN.md §10, listed in price order (the Collection list reads this way).
// Every dial fills hour by hour: passed hours stay lit, the current one blends in (§6).
export const DIALS: readonly Dial[] = [
  { id: 'lantern', name: 'Lantern', description: 'Soft wedges lit from within. Each hour fills in as it passes.', price: 0 },
  { id: 'hairline', name: 'Hairline', description: 'A thin ring and ticks. Each hour adds a bright arc.', price: 6 },
  { id: 'rays', name: 'Rays', description: 'Twelve lines from the center. Each hour lights one more.', price: 8 },
  { id: 'sector', name: 'Sector', description: 'Filled arcs. Each hour fills in as it passes.', price: 10 },
  { id: 'orbit', name: 'Orbit', description: 'Twelve points around the hour. Each one swells as it passes.', price: 12 },
]

export function isDialId(value: string): value is DialId {
  return DIALS.some((d) => d.id === value)
}

export function getDial(id: string): Dial {
  return DIALS.find((d) => d.id === id) ?? DIALS.find((d) => d.id === DEFAULT_DIAL_ID)!
}
