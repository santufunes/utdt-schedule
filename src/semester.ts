// Calendario académico UTDT · 2026 2º semestre.
// Clases del 03/08 al 27/11. Sin clases: feriados, días no laborables y
// semanas de parciales (28/9–9/10). Los finales (30/11–18/12) caen después
// del fin de clases; recuperaciones (sábados) y encuestas no afectan.

import type { Day, Slot } from './data'

export const TZ = 'America/Argentina/Buenos_Aires'
export const SEMESTER_START = '2026-08-03' // lunes
export const SEMESTER_END = '2026-11-27' // viernes, fin de clases

// Días hábiles sin clases (feriados y no laborables que caen Lu–Vi)
export const NO_CLASS_DATES = new Set([
  '2026-08-17', // Paso a la Inmortalidad del Gral. San Martín
  '2026-09-11', // Año Nuevo Judío (11–13/9; sólo el viernes es día de clase)
  '2026-09-21', // Día del Perdón (20–21/9; sólo el lunes es día de clase)
  '2026-10-12', // Día del Respeto a la Diversidad Cultural
  '2026-11-23', // Día de la Soberanía Nacional
])

// Rangos sin clases (inclusive): exámenes parciales
export const NO_CLASS_RANGES: [string, string][] = [['2026-09-28', '2026-10-09']]

export const isClassDay = (iso: string): boolean => {
  if (NO_CLASS_DATES.has(iso)) return false
  for (const [from, to] of NO_CLASS_RANGES) if (iso >= from && iso <= to) return false
  return true
}

const toISO = (d: Date) => d.toISOString().slice(0, 10)

/** Fechas concretas (ISO yyyy-mm-dd) en las que se dicta un slot semanal. */
export function occurrencesFor(day: Day): string[] {
  const out: string[] = []
  const cursor = new Date(`${SEMESTER_START}T00:00:00Z`)
  const end = new Date(`${SEMESTER_END}T00:00:00Z`)
  while (cursor <= end) {
    if (cursor.getUTCDay() === day) {
      const iso = toISO(cursor)
      if (isClassDay(iso)) out.push(iso)
      cursor.setUTCDate(cursor.getUTCDate() + 7) // ya estamos en el día buscado
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }
  return out
}

/** Primera fecha del semestre que cae en el día dado (sin filtrar exclusiones). */
export function firstDateFor(day: Day): string {
  const cursor = new Date(`${SEMESTER_START}T00:00:00Z`)
  for (let i = 0; i < 7 && cursor.getUTCDay() !== day; i++)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  return toISO(cursor)
}

/** Fechas del semestre que caen en el día dado y NO tienen clase (para EXDATE). */
export function excludedDatesFor(day: Day): string[] {
  const out: string[] = []
  const cursor = new Date(`${firstDateFor(day)}T00:00:00Z`)
  const end = new Date(`${SEMESTER_END}T00:00:00Z`)
  while (cursor <= end) {
    const iso = toISO(cursor)
    if (!isClassDay(iso)) out.push(iso)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return out
}

export const slotOccurrences = (slot: Slot): string[] => occurrencesFor(slot.day)
