import type { CSSProperties } from 'react'
import { DAY_ABBR, DAY_FULL, fmt } from '../data'
import type { Day, Slot } from '../data'

export interface CalendarEntry {
  slot: Slot
  color: string
  short: string
  ghost: boolean
}

const START = 8 * 60
const END = 19 * 60
const SPAN = END - START
const DAYS: Day[] = [1, 2, 3, 4, 5]
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i) // 8..18

const pct = (min: number) => `${((min - START) / SPAN) * 100}%`

export default function Calendar({
  entries,
  complete,
  legend,
  showGhostHint,
}: {
  entries: CalendarEntry[]
  complete: boolean
  legend: { short: string; color: string }[]
  showGhostHint: boolean
}) {
  return (
    <div className="cal">
      <div className="cal-head">
        <div className="cal-gutter" />
        {DAYS.map((d) => (
          <div key={d} className="cal-day-name">
            <span className="long">{DAY_FULL[d]}</span>
            <span className="shortn">{DAY_ABBR[d]}</span>
          </div>
        ))}
      </div>
      <div className="cal-body">
        <div className="cal-gutter">
          {HOURS.map((h) => (
            <span key={h} style={{ top: pct(h * 60) }}>
              {h}
            </span>
          ))}
        </div>
        {DAYS.map((d) => {
          const dayEntries = entries.filter((e) => e.slot.day === d)
          return (
            <div key={d} className="cal-col">
              {HOURS.map((h) => (
                <i key={h} className="cal-line" style={{ top: pct(h * 60) }} />
              ))}
              {complete && dayEntries.length === 0 && <span className="cal-free">libre ✦</span>}
              {dayEntries.map((e) => (
                <div
                  key={e.slot.id}
                  className={`cal-block${e.ghost ? ' ghost' : ''}`}
                  style={
                    {
                      '--c': e.color,
                      top: pct(e.slot.start),
                      height: `${((e.slot.end - e.slot.start) / SPAN) * 100}%`,
                    } as CSSProperties
                  }
                  title={`${e.short} · ${e.slot.kind === 'T' ? 'Teórica' : 'Práctica'} · ${fmt(
                    e.slot.start,
                  )}–${fmt(e.slot.end)} · ${e.slot.room}${e.ghost ? ' (única opción restante)' : ''}`}
                >
                  <b>
                    {e.short} · {e.slot.kind === 'T' ? 'T' : 'P'}
                  </b>
                  <span>
                    {fmt(e.slot.start)}–{fmt(e.slot.end)}
                  </span>
                  <span className="cal-room">{e.slot.room}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="cal-legend">
        {legend.map((item) => (
          <span key={item.short} className="legend-item" style={{ '--c': item.color } as CSSProperties}>
            <i /> {item.short}
          </span>
        ))}
        {showGhostHint && <span className="legend-item ghost-hint">▨ única opción restante</span>}
      </div>
    </div>
  )
}
