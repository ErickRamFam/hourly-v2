export type DialId = 'sector' | 'hairline' | 'rays' | 'lantern' | 'orbit'

export type Dial = {
  id: DialId
  name: string
  description: string
  price: number
}

export const DEFAULT_DIAL_ID: DialId = 'sector'

// Copy and prices from DESIGN.md §9.
export const DIALS: readonly Dial[] = [
  { id: 'sector', name: 'Sector', description: 'Filled arcs. The lit hour is a solid wedge of light.', price: 0 },
  { id: 'hairline', name: 'Hairline', description: 'A thin ring and ticks. The lit hour is a bright arc.', price: 6 },
  { id: 'rays', name: 'Rays', description: 'Twelve lines from the center. The lit one glows.', price: 8 },
  { id: 'lantern', name: 'Lantern', description: 'Soft wedges with no edges, lit from within.', price: 10 },
  { id: 'orbit', name: 'Orbit', description: 'Twelve points around the hour. The lit one swells.', price: 12 },
]

export function isDialId(value: string): value is DialId {
  return DIALS.some((d) => d.id === value)
}

export function getDial(id: string): Dial {
  return DIALS.find((d) => d.id === id) ?? DIALS[0]
}
