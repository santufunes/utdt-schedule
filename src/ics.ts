// Exportación .ics del horario elegido: un VEVENT recurrente por clase, con
// EXDATE para feriados/no laborables/parciales y sin VALARM (sin alertas).
// Espeja la estructura de los eventos creados en Google Calendar.

import { fmt } from './data'
import type { Course, Slot } from './data'
import { TZ, excludedDatesFor, firstDateFor } from './semester'

const compact = (iso: string) => iso.replaceAll('-', '')
const hhmmss = (min: number) => `${fmt(min).replace(':', '')}00`

// Fin de clases 27/11 23:59:59 -03 expresado en UTC, como exige RFC 5545
// cuando DTSTART lleva TZID.
const UNTIL_UTC = '20261128T025959Z'

const escapeText = (s: string) =>
  s.replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\n', '\\n')

// Plegado de líneas a ~72 octetos (RFC 5545 §3.1); alcanza con cortar por chars.
const fold = (line: string): string => {
  if (line.length <= 72) return line
  const parts: string[] = []
  let rest = line
  parts.push(rest.slice(0, 72))
  rest = rest.slice(72)
  while (rest.length > 0) {
    parts.push(' ' + rest.slice(0, 71))
    rest = rest.slice(71)
  }
  return parts.join('\r\n')
}

export function buildICS(slots: Slot[], courses: Course[]): string {
  const byId = new Map(courses.map((c) => [c.id, c]))
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//horarios-utdt//2026-2S//ES',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:UTDT 2026 · 2º semestre',
    `X-WR-TIMEZONE:${TZ}`,
    'BEGIN:VTIMEZONE',
    `TZID:${TZ}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:-03',
    'END:STANDARD',
    'END:VTIMEZONE',
  ]

  for (const slot of slots) {
    const course = byId.get(slot.courseId)!
    const first = compact(firstDateFor(slot.day))
    const exdates = excludedDatesFor(slot.day)
    const kind = slot.kind === 'T' ? 'Teórica' : 'Práctica'
    const desc = `${course.name} (${course.code})${slot.section ? ` · Sección ${slot.section}` : ''} · ${course.people}`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${slot.id}-2026-2s@horarios-utdt`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${TZ}:${first}T${hhmmss(slot.start)}`,
      `DTEND;TZID=${TZ}:${first}T${hhmmss(slot.end)}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${UNTIL_UTC}`,
    )
    if (exdates.length > 0) {
      lines.push(
        `EXDATE;TZID=${TZ}:${exdates.map((d) => `${compact(d)}T${hhmmss(slot.start)}`).join(',')}`,
      )
    }
    lines.push(
      `SUMMARY:${escapeText(`${course.short} · ${kind}`)}`,
      `LOCATION:${escapeText(`UTDT · Aula ${slot.room}`)}`,
      `DESCRIPTION:${escapeText(desc)}`,
      'TRANSP:OPAQUE',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadICS(slots: Slot[], courses: Course[]) {
  const blob = new Blob([buildICS(slots, courses)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'horarios-utdt-2026-2s.ics'
  a.click()
  URL.revokeObjectURL(url)
}
