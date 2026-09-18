import { DIALS, type DialId } from '../lib/dials'
import { SKIES, getSky, type Sky } from '../lib/skies'
import type { ItemKind } from '../state/types'
import { useNow } from '../state/useNow'
import { useReducedMotion } from '../state/useReducedMotion'
import { useAppState, useDispatch, useLumens } from '../state/useStore'
import { Clock } from './clock/Clock'
import { DialArt } from './clock/DialArt'
import { PREVIEW } from './clock/dialGeometry'
import { skyGradient, skyTickLeft } from './visuals'

function lumens(n: number): string {
  return n === 1 ? '1 lumen' : `${n} lumens`
}

type Status = 'equipped' | 'owned' | 'locked'

function ItemState({ kind, id, name, price, status, balance }: { kind: ItemKind; id: string; name: string; price: number; status: Status; balance: number }) {
  const dispatch = useDispatch()
  if (status === 'equipped') {
    return <span className="state equipped flex flex-none items-center gap-1.5 text-small font-medium text-slate">Equipped</span>
  }
  if (status === 'owned') {
    return (
      <span className="state flex flex-none items-center gap-1.5 text-small font-medium">
        <button type="button" className="press text-hour-ink" aria-label={`Equip ${name}`} onClick={() => dispatch({ type: 'equip', kind, id })}>
          Equip
        </button>
      </span>
    )
  }
  const affordable = balance >= price
  return (
    <span className="state flex flex-none items-center gap-1.5 text-small font-medium text-pewter">
      {lumens(price)}
      {affordable && (
        <button type="button" className="press text-hour-ink" aria-label={`Buy ${name} for ${lumens(price)}`} onClick={() => dispatch({ type: 'unlock', kind, id, now: Date.now() })}>
          Buy
        </button>
      )}
    </span>
  )
}

function SkyStrip({ sky, tickHour }: { sky: Sky; tickHour: number | null }) {
  return (
    <div className="strip-wrap relative mt-2 mb-3 h-1.5 w-[200px]" aria-hidden="true">
      <div className="strip absolute inset-0 rounded-pill" style={{ background: skyGradient(sky) }} />
      {tickHour !== null && <i className="tick absolute top-2.5 block h-1 w-px bg-ink" style={{ left: `${skyTickLeft(tickHour)}px` }} />}
    </div>
  )
}

/** The equipped dial, drawn once at 168px with real hands and the real sky. */
function DialPreview({ dial, sky }: { dial: DialId; sky: Sky }) {
  const { settings } = useAppState()
  const reduceMotion = useReducedMotion(settings)
  const sweep = settings.secondHand === 'sweep' && !reduceMotion
  const now = useNow(settings.secondHand === 'hidden' ? 'minute' : sweep ? 'frame' : 'second')
  const info = DIALS.find((d) => d.id === dial)!
  return (
    <div className="preview flex items-center gap-5 pt-1.5 pb-3" data-dial={dial}>
      <div className="flex-none" style={{ width: PREVIEW.size, height: PREVIEW.size }}>
        <Clock now={now} dial={dial} sky={sky} secondHand={settings.secondHand} reduceMotion={reduceMotion} use24h={settings.use24h} preview className="block size-full" />
      </div>
      <div>
        <div className="text-quest leading-[1.3] font-[450] text-ink">{info.name}</div>
        <div className="mt-0.5 text-small font-normal text-slate">{info.description}</div>
        <div className="state equipped mt-2 flex items-center gap-1.5 text-small font-medium text-slate">Equipped</div>
      </div>
    </div>
  )
}

const GROUP = 'group-title mt-7 mb-1.5 border-t border-line pt-3.5 font-serif text-group font-normal text-ink'

export function CollectionPanel() {
  const { owned, equipped } = useAppState()
  const { balance, lifetime } = useLumens()
  const now = useNow('minute')
  const sky = getSky(equipped.sky)
  const statusOf = (list: string[], current: string, id: string): Status => (current === id ? 'equipped' : list.includes(id) ? 'owned' : 'locked')
  const allOwned = DIALS.every((d) => owned.dials.includes(d.id)) && SKIES.every((s) => owned.skies.includes(s.id))

  return (
    <div className="collection">
      <p className="balance mt-2.5 mb-0 text-body text-slate">
        You have {lumens(balance)}, {lifetime} earned in all.
      </p>
      {allOwned && <p className="mt-2 mb-0 text-body text-slate">You have the whole collection.</p>}

      <h3 className={GROUP}>Dials</h3>
      <DialPreview dial={equipped.dial as DialId} sky={sky} />
      <ul className="items m-0 list-none p-0">
        {DIALS.filter((d) => d.id !== equipped.dial).map((d) => {
          const status = statusOf(owned.dials, equipped.dial, d.id)
          return (
            <li key={d.id} className={`item flex min-h-[66px] items-center gap-3.5 border-t border-line py-1.5 ${status === 'locked' ? 'locked' : ''}`} data-status={status}>
              <DialArt dial={d.id} sky={sky} />
              <span className="min-w-0 flex-1">
                <span className="block text-quest leading-[1.3] font-[450] text-ink">{d.name}</span>
                <span className="mt-0.5 block text-small font-normal text-slate">{d.description}</span>
              </span>
              <ItemState kind="dial" id={d.id} name={d.name} price={d.price} status={status} balance={balance} />
            </li>
          )
        })}
      </ul>

      <h3 className={GROUP}>Skies</h3>
      <ul className="items m-0 list-none p-0">
        {SKIES.map((s) => {
          const status = statusOf(owned.skies, equipped.sky, s.id)
          return (
            <li key={s.id} className={`item sky-item block border-t border-line py-2.5 ${status === 'locked' ? 'locked' : ''}`} data-status={status}>
              <div className="flex items-baseline justify-between">
                <span className="text-quest leading-[1.3] font-[450] text-ink">{s.name}</span>
                <ItemState kind="sky" id={s.id} name={s.name} price={s.price} status={status} balance={balance} />
              </div>
              <SkyStrip sky={s} tickHour={status === 'equipped' ? now.getHours() : null} />
              <span className="block text-small font-normal text-slate">{s.description}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
