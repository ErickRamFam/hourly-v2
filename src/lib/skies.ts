export type Sky = {
  id: string
  name: string
  description: string
  price: number
  /** 24 hex colors, one per hour of the day (index = hour 0–23). Drives tints, halo, aurora. */
  hours: readonly string[]
  /**
   * Sky whose stop lights the current section, the second hand and --hour-ink.
   * Graphite borrows Daylight so the lit wedge is the only color on the page.
   */
  litFrom?: string
}

export const DEFAULT_SKY_ID = 'daylight'

// Values from DESIGN.md §2. Index = hour 0–23.
export const SKIES: readonly Sky[] = [
  {
    id: 'daylight',
    name: 'Daylight',
    description: 'Indigo to gold and back, the way a day goes.',
    price: 0,
    hours: [
      '#4C4FA6', '#444A9F', '#3E4497', '#47459C', '#5A50A6', '#7A62B0',
      '#B97A9F', '#DC8B86', '#EBA77C', '#86B3D8', '#5EA3DC', '#7FB8D8',
      '#E8B93F', '#E6C35C', '#DBC784', '#E0B252', '#E39F48', '#E6864A',
      '#E2735F', '#D2687A', '#AB6A94', '#8661A4', '#6857A9', '#5652A9',
    ],
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm all day, from wine to apricot to coal.',
    price: 8,
    hours: [
      '#6E3A5C', '#663554', '#5E3150', '#6B3556', '#83405E', '#9E4A5F',
      '#B85A5A', '#CF6E52', '#DE8551', '#E39A55', '#E6AC5C', '#E9BB67',
      '#F0CB7A', '#ECBD6E', '#E8B168', '#E5A15C', '#E38E4F', '#E07846',
      '#DA6146', '#CC5150', '#B4485B', '#984262', '#833E63', '#763B60',
    ],
  },
  {
    id: 'tide',
    name: 'Tide',
    description: 'Sea glass and deep water.',
    price: 8,
    hours: [
      '#2F5A78', '#2B5473', '#284F6E', '#2C5877', '#327089', '#3A8698',
      '#4A9DA5', '#5DB2AE', '#72C2B4', '#86CDBD', '#98D5C6', '#ABDCCF',
      '#BFE3D6', '#B4DED2', '#A6D6CA', '#94CCC0', '#7FC0B4', '#6AB1AA',
      '#58A0A2', '#4B8D9A', '#407A90', '#386A87', '#325F7E', '#305C7B',
    ],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Everything grey, so the lit hour is the only color.',
    price: 10,
    litFrom: 'daylight',
    hours: [
      '#4A5060', '#4D5363', '#505666', '#545A6A', '#5B6171', '#646A7A',
      '#6E7484', '#79808F', '#858C9A', '#9299A6', '#9EA5B1', '#AAB0BB',
      '#B6BCC6', '#B0B6C1', '#A8AEBA', '#9FA5B2', '#959CA9', '#8B92A0',
      '#808796', '#747B8B', '#686F80', '#5D6374', '#535969', '#4E5464',
    ],
  },
]

export function getSky(id: string): Sky {
  return SKIES.find((s) => s.id === id) ?? SKIES[0]
}

function wrap(hour: number): number {
  return ((Math.floor(hour) % 24) + 24) % 24
}

/** Ramp stop for `hour` (0–23) in `sky`: ring tints, halo, aurora, page wash. Out-of-range hours wrap. */
export function hourHue(sky: Sky, hour: number): string {
  return sky.hours[wrap(hour)]
}

/** Color of the lit section, second hand and --hour-ink for `hour`. Graphite borrows Daylight. */
export function litHue(sky: Sky, hour: number): string {
  const source = sky.litFrom ? getSky(sky.litFrom) : sky
  return source.hours[wrap(hour)]
}

/** The 12 ramp stops of the lap (AM 0–11 or PM 12–23) that contains `hour`, indexed by ring section. */
export function lapStops(sky: Sky, hour: number): string[] {
  const lap = wrap(hour) < 12 ? 0 : 12
  return Array.from({ length: 12 }, (_, i) => sky.hours[lap + i])
}
