// Chequeos del calendario académico y de la exportación .ics.
// Derivación a mano: 17 semanas (Lu 3/8 … Vi 27/11) menos exclusiones:
//   Lunes:    17 − (17/8, 21/9, 28/9, 5/10, 12/10, 23/11) = 11
//   Martes:   17 − (29/9, 6/10)                            = 15
//   Miércoles:17 − (30/9, 7/10)                            = 15
//   Jueves:   17 − (1/10, 8/10)                            = 15
//   Viernes:  17 − (11/9, 2/10, 9/10)                      = 14  → total 70

import { COURSES } from '../src/data'
import type { Day, Slot } from '../src/data'
import { excludedDatesFor, firstDateFor, isClassDay, occurrencesFor } from '../src/semester'
import { buildICS } from '../src/ics'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++
    console.error('FAIL –', msg)
  } else {
    console.log('ok   –', msg)
  }
}

// 1. Primeras fechas por día
const firsts: Record<Day, string> = {
  1: '2026-08-03',
  2: '2026-08-04',
  3: '2026-08-05',
  4: '2026-08-06',
  5: '2026-08-07',
}
for (const d of [1, 2, 3, 4, 5] as Day[])
  assert(firstDateFor(d) === firsts[d], `primer ${d} = ${firsts[d]} (got ${firstDateFor(d)})`)

// 2. Conteo de clases por día de semana
const expected: Record<Day, number> = { 1: 11, 2: 15, 3: 15, 4: 15, 5: 14 }
let total = 0
for (const d of [1, 2, 3, 4, 5] as Day[]) {
  const occ = occurrencesFor(d)
  total += occ.length
  assert(occ.length === expected[d], `día ${d}: ${expected[d]} clases (got ${occ.length})`)
}
assert(total === 70, `70 días de clase en total (got ${total})`)

// 3. Fechas puntuales
assert(!isClassDay('2026-08-17'), 'sin clase el 17/8 (San Martín)')
assert(!isClassDay('2026-09-11'), 'sin clase el 11/9 (Año Nuevo Judío)')
assert(!isClassDay('2026-09-21'), 'sin clase el 21/9 (Día del Perdón)')
assert(!isClassDay('2026-10-06'), 'sin clase el 6/10 (parciales)')
assert(!isClassDay('2026-10-12'), 'sin clase el 12/10 (feriado)')
assert(!isClassDay('2026-11-23'), 'sin clase el 23/11 (Soberanía)')
assert(isClassDay('2026-08-24'), 'clase normal el 24/8')
assert(isClassDay('2026-10-16'), 'clase normal el 16/10 (post-parciales)')
assert(isClassDay('2026-11-27'), 'último día de clases 27/11')
const mondays = occurrencesFor(1)
assert(mondays[0] === '2026-08-03', 'primer lunes de clase: 3/8')
assert(mondays[mondays.length - 1] === '2026-11-16', 'último lunes de clase: 16/11 (23/11 feriado)')
const fridays = occurrencesFor(5)
assert(fridays[fridays.length - 1] === '2026-11-27', 'último viernes de clase: 27/11')

// 4. EXDATE por día (deben ser exactamente las exclusiones de ese día)
assert(
  excludedDatesFor(1).join(',') ===
    '2026-08-17,2026-09-21,2026-09-28,2026-10-05,2026-10-12,2026-11-23',
  'EXDATEs de lunes',
)
assert(excludedDatesFor(2).join(',') === '2026-09-29,2026-10-06', 'EXDATEs de martes')
assert(excludedDatesFor(5).join(',') === '2026-09-11,2026-10-02,2026-10-09', 'EXDATEs de viernes')

// 5. ICS con un horario completo real
const chosen = new Set([
  'hea-teo-ma', 'hea-teo-ju', 'oi-pra-vi-s2', 'rif-pra-vi-s1', 'emi-teo-ma-s1',
  'emi-teo-lu-s1', 'rif-teo-ma-s2', 'oi-teo-mi-s1', 'oi-teo-ju-s1', 'rif-teo-ju-s1',
  'tea-teo-ju-s2', 'tea-teo-lu-s1', 'tea-pra-mi-s2', 'emi-pra-mi-s2',
])
const slots: Slot[] = COURSES.flatMap((c) => c.groups.flatMap((g) => g.slots)).filter((s) =>
  chosen.has(s.id),
)
assert(slots.length === 14, '14 slots seleccionados para el ICS')
const ics = buildICS(slots, COURSES)
assert((ics.match(/BEGIN:VEVENT/g) ?? []).length === 14, 'ICS con 14 VEVENT')
assert(!ics.includes('VALARM'), 'ICS sin alarmas (sin notificaciones)')
assert((ics.match(/RRULE:FREQ=WEEKLY;UNTIL=20261128T025959Z/g) ?? []).length === 14, 'RRULE con UNTIL correcto en los 14')
assert(ics.includes('DTSTART;TZID=America/Argentina/Buenos_Aires:20260803T134500'), 'TEA teórica arranca Lu 3/8 13:45')
assert(ics.includes('20260817T134500'), 'EXDATE del 17/8 para clases de lunes')
assert(ics.includes('LOCATION:UTDT · Aula A101'), 'TEA práctica en A101')
assert(ics.split('\r\n').every((l) => l.length <= 75), 'todas las líneas ≤75 chars (plegado RFC 5545)')

if (failures) {
  console.error(`\n${failures} chequeo(s) fallaron`)
  process.exit(1)
} else {
  console.log('\nTodos los chequeos pasaron ✓')
}
