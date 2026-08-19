// Ediciones del usuario sobre el dataset base: cambiar día/hora/aula/sección
// de un horario, ocultar opciones o agregar opciones nuevas a un grupo.
// Se aplican antes de armar el motor, se guardan en localStorage y se
// sincronizan entre dispositivos vía un evento de configuración oculto en el
// calendario "UTDT".

import type { Course, Day, Slot } from './data'

export interface SlotPatch {
  day?: Day
  start?: number
  end?: number
  room?: string
  section?: 1 | 2 | null
}

export interface AddedSlot {
  id: string
  groupId: string
  day: Day
  start: number
  end: number
  room: string
  section: 1 | 2 | null
  kind: 'T' | 'P'
}

export interface Overrides {
  v: 1
  edited: Record<string, SlotPatch>
  removed: string[]
  added: AddedSlot[]
}

export const EMPTY_OVERRIDES: Overrides = { v: 1, edited: {}, removed: [], added: [] }

export const isEmptyOverrides = (o: Overrides): boolean =>
  Object.keys(o.edited).length === 0 && o.removed.length === 0 && o.added.length === 0

/** Clave estable para comparar dos estados de overrides. */
export const overridesKey = (o: Overrides): string =>
  JSON.stringify({
    edited: Object.fromEntries(Object.entries(o.edited).sort(([a], [b]) => (a < b ? -1 : 1))),
    removed: [...o.removed].sort(),
    added: [...o.added].sort((a, b) => (a.id < b.id ? -1 : 1)),
  })

const isDay = (d: unknown): d is Day =>
  typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 5
const isMin = (m: unknown): m is number =>
  typeof m === 'number' && Number.isInteger(m) && m >= 0 && m < 24 * 60
const isSection = (s: unknown): s is 1 | 2 | null => s === 1 || s === 2 || s === null

/** Valida un objeto crudo (localStorage o nube). Devuelve null si no sirve. */
export function normalizeOverrides(raw: unknown): Overrides | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Partial<Overrides>
  if (o.v !== 1) return null
  const out: Overrides = { v: 1, edited: {}, removed: [], added: [] }
  if (o.edited && typeof o.edited === 'object') {
    for (const [id, p] of Object.entries(o.edited)) {
      if (typeof p !== 'object' || p === null) continue
      const patch: SlotPatch = {}
      if (isDay(p.day)) patch.day = p.day
      if (isMin(p.start)) patch.start = p.start
      if (isMin(p.end)) patch.end = p.end
      if (typeof p.room === 'string' && p.room.trim()) patch.room = p.room.trim().slice(0, 24)
      if (isSection(p.section)) patch.section = p.section
      if (Object.keys(patch).length > 0) out.edited[id] = patch
    }
  }
  if (Array.isArray(o.removed)) out.removed = o.removed.filter((r) => typeof r === 'string')
  if (Array.isArray(o.added)) {
    for (const a of o.added) {
      if (
        typeof a === 'object' &&
        a !== null &&
        typeof a.id === 'string' &&
        typeof a.groupId === 'string' &&
        isDay(a.day) &&
        isMin(a.start) &&
        isMin(a.end) &&
        a.start < a.end &&
        typeof a.room === 'string' &&
        isSection(a.section) &&
        (a.kind === 'T' || a.kind === 'P')
      ) {
        out.added.push({
          id: a.id,
          groupId: a.groupId,
          day: a.day,
          start: a.start,
          end: a.end,
          room: a.room.trim().slice(0, 24) || '—',
          section: a.section,
          kind: a.kind,
        })
      }
    }
  }
  return out
}

/** Dataset efectivo: base con parches, sin ocultos, con agregados, ordenado. */
export function applyOverrides(base: Course[], o: Overrides): Course[] {
  const removed = new Set(o.removed)
  return base.map((course) => ({
    ...course,
    groups: course.groups.map((group) => {
      const slots: Slot[] = group.slots
        .filter((s) => !removed.has(s.id))
        .map((s) => {
          const patch = o.edited[s.id]
          if (!patch) return s
          const merged = { ...s, ...patch }
          return merged.start < merged.end ? merged : s
        })
      for (const a of o.added) {
        if (a.groupId !== group.id) continue
        slots.push({
          id: a.id,
          courseId: course.id,
          day: a.day,
          start: a.start,
          end: a.end,
          room: a.room,
          section: a.section,
          kind: a.kind,
          note: 'Opción agregada por vos.',
        })
      }
      slots.sort((x, y) => x.day - y.day || x.start - y.start || (x.id < y.id ? -1 : 1))
      return { ...group, slots }
    }),
  }))
}
